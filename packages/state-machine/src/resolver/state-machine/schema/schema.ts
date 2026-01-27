import {
  type ClassResource,
  type GetResourceProps,
  getMetadataPrototypeByKey,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type LambdaMetadata,
  LambdaReflectKeys,
} from '@lafken/common';
import { lambdaAssets, resolveCallbackResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import {
  type IntegrationStateProps,
  type LambdaStateMetadata,
  type LambdaStateProps,
  type RetryCatchTypes,
  type StateMachineObjectParam,
  type StateMachineParamMetadata,
  type StateMachineResourceMetadata,
  type StateMachineSource,
  type StateMachineStringParam,
  type StateSource,
  type StateTypes,
  stateMachineFieldKey,
  type TaskSource,
} from '../../../main';
import type {
  BucketPermission,
  Catch,
  ChoiceCondition,
  DefinitionSchema,
  ExecutionType,
  ItemProcessor,
  ItemReader,
  ItemReaderTypes,
  MapTask,
  ParallelBranch,
  PermissionType,
  Retry,
  SchemaProps,
  States,
  StatesWithCatchErrors,
  StateTask,
} from './schema.types';
import {
  LambdaStates,
  mapIntegrationMode,
  mapSourceExecution,
  mapSourceState,
  mapSourceStateMachine,
  mapSourceTask,
  StateNames,
} from './schema.utils';

export class Schema {
  private states: Record<string, States> = {};
  private resourceMetadata: StateMachineResourceMetadata;
  private handlers: Record<string, LambdaStateMetadata> = {};
  private stateNames: StateNames;
  private lambdaStates: LambdaStates;
  private unresolvedDependency: boolean = false;
  private bucketPermissions: BucketPermission = {};

  constructor(
    private scope: Construct,
    private resource: ClassResource,
    props: SchemaProps = {}
  ) {
    this.stateNames = props.stateNames || new StateNames();
    this.lambdaStates = props.lambdas || new LambdaStates();

    this.getMetadata(props.initializeAssets ?? false);
  }

  public getDefinition(): DefinitionSchema {
    const startName = this.getNextState(this.resourceMetadata.startAt);

    return {
      StartAt: startName as string,
      States: this.states,
    };
  }

  public async resolveArguments(definition: DefinitionSchema) {
    for (const key in definition.States) {
      const state = definition.States[key];
      if (state.Type === 'Task' && typeof state.Arguments === 'function') {
        state.Arguments = await state.Arguments();
      }

      if (state.Type === 'Map') {
        await this.resolveArguments(state.ItemProcessor);
      }

      if (state.Type === 'Parallel') {
        for (const branch of state.Branches) {
          await this.resolveArguments(branch);
        }
      }
    }

    return definition;
  }

  get hasUnresolvedDependency() {
    return this.unresolvedDependency;
  }

  get buckets() {
    return this.bucketPermissions;
  }

  private getMetadata(initializeAssets: boolean) {
    this.resourceMetadata = getResourceMetadata<StateMachineResourceMetadata>(
      this.resource
    );
    const handlers = getResourceHandlerMetadata<LambdaStateMetadata>(this.resource);
    this.handlers = handlers.reduce(
      (acc, handler) => {
        acc[handler.name] = handler;
        return acc;
      },
      {} as Record<string, LambdaStateMetadata>
    );

    if (initializeAssets) {
      lambdaAssets.initializeMetadata({
        foldername: this.resourceMetadata.foldername,
        filename: this.resourceMetadata.filename,
        className: this.resourceMetadata.originalName,
        methods: handlers.map((handler) => handler.name),
        minify: this.resourceMetadata.minify,
      });
    }
  }

  private getNextState(currentState?: StateTypes<string>, end = false) {
    if (!currentState || end) {
      return;
    }

    if (typeof currentState === 'string') {
      return this.addTaskState(this.handlers[currentState]);
    }

    const stateName = this.getStateName(currentState);

    switch (currentState.type) {
      case 'wait': {
        this.states[stateName] = {
          Type: 'Wait',
          Seconds: currentState.seconds,
          Timestamp: currentState.timestamp,
          Next: this.getNextState(currentState.next),
        };
        break;
      }
      case 'choice': {
        const choices: ChoiceCondition[] = [];

        for (const choice of currentState.choices) {
          choices.push({
            Condition: choice.condition,
            Next: this.getNextState(choice.next) as string,
          });
        }

        this.states[stateName] = {
          Type: 'Choice',
          Choices: choices,
          Default: this.getNextState(currentState.default),
        };

        break;
      }
      case 'fail': {
        this.states[stateName] = {
          Type: 'Fail',
          Cause: currentState.cause,
          Error: currentState.error,
        };
        break;
      }
      case 'succeed': {
        this.states[stateName] = {
          Type: 'Succeed',
          Output: currentState.output,
        };
        break;
      }
      case 'pass': {
        this.states[stateName] = {
          Type: 'Pass',
          Assign: currentState.assign,
          Output: currentState.output,
          End: currentState.end,
          Next: this.getNextState(currentState.next, currentState.end),
        };
        break;
      }
      case 'parallel': {
        const branchStates: ParallelBranch[] = [];

        for (let i = 0; i < currentState.branches.length; i++) {
          const branch = currentState.branches[i];
          const branchSchema = new Schema(this.scope, branch, {
            initializeAssets: true,
            lambdas: this.lambdaStates,
            stateNames: this.stateNames,
          });
          branchStates.push(branchSchema.getDefinition());
          this.mergeBucketPermissions(branchSchema.buckets);
          this.setUnresolvedDependency(branchSchema.unresolvedDependency);
        }

        this.states[stateName] = {
          Type: 'Parallel',
          Arguments: this.getParallelArguments(currentState.arguments),
          Output: currentState.output,
          Assign: currentState.assign,
          End: currentState.end ?? currentState.next === undefined,
          Next: this.getNextState(currentState.next, currentState.end),
          Branches: branchStates,
        };
        this.addRetryAndCatch(currentState, stateName);
        break;
      }
      case 'map': {
        const mapSchema = new Schema(this.scope, currentState.states, {
          initializeAssets: true,
          lambdas: this.lambdaStates,
          stateNames: this.stateNames,
        });
        this.mergeBucketPermissions(mapSchema.buckets);
        const mapState = mapSchema.getDefinition();
        this.setUnresolvedDependency(mapSchema.hasUnresolvedDependency);

        const itemProcessor: Partial<ItemProcessor> = {
          ...mapState,
          ProcessorConfig: {
            Mode: 'INLINE',
          },
        };

        const mapTask: MapTask = {
          Type: 'Map',
          Items: currentState.items,
          ItemProcessor: itemProcessor as ItemProcessor,
          End: currentState.end ?? currentState.next === undefined,
          Next: this.getNextState(currentState.next, currentState.end),
          Output: currentState.output,
          Assign: currentState.assign,
        };

        if (currentState.mode === 'distributed') {
          itemProcessor.ProcessorConfig = {
            Mode: 'DISTRIBUTED',
            ExecutionType: (
              currentState.executionType || 'STANDARD'
            ).toUpperCase() as ExecutionType,
          };

          mapTask.ItemProcessor = itemProcessor as ItemProcessor;
          if (currentState.itemReader) {
            this.addBucketPermission(currentState.itemReader.bucket, 'read');
            const readerConfig: ItemReader = {
              Resource: 'arn:aws:states:::s3:getObject',
              Arguments: {
                Bucket: currentState.itemReader.bucket,
                Key: currentState.itemReader.key,
              },
              ReaderConfig: {
                InputType:
                  currentState.itemReader.source.toUpperCase() as ItemReaderTypes,
              },
            };

            if (currentState.itemReader.source === 'csv') {
              readerConfig.ReaderConfig.CSVDelimiter = currentState.itemReader.delimiter;
              readerConfig.ReaderConfig.CSVHeaderLocation =
                currentState.itemReader.headers?.location;
              readerConfig.ReaderConfig.CSVHeaders =
                currentState.itemReader.headers?.titles;
              readerConfig.ReaderConfig.MaxItems = currentState.itemReader.maxItems;
            }

            mapTask.ItemReader = readerConfig;
          }

          if (currentState.resultWriter) {
            this.addBucketPermission(currentState.resultWriter.bucket, 'write');
            mapTask.ResultWriter = {
              Resource: 'arn:aws:states:::s3:putObject',
              Arguments: {
                Bucket: currentState.resultWriter.bucket,
                Prefix: currentState.resultWriter.prefix,
              },
              WriterConfig: currentState.resultWriter.config
                ? {
                    OutputType: currentState.resultWriter.config.outputType,
                    Transformation: currentState.resultWriter.config?.transformation,
                  }
                : undefined,
            };
          }

          if (currentState.maxItemsPerBatch) {
            mapTask.ItemBatcher = {
              MaxItemsPerBatch: currentState.maxItemsPerBatch,
            };
          }

          if (currentState.toleratedFailureCount) {
            mapTask.ToleratedFailureCount = currentState.toleratedFailureCount;
          }

          if (currentState.toleratedFailurePercentage) {
            mapTask.ToleratedFailurePercentage =
              currentState.toleratedFailurePercentage.toString();
          }
        }

        this.states[stateName] = mapTask;
        this.addRetryAndCatch(currentState, stateName);

        break;
      }
    }

    return stateName;
  }

  private getStateName(currentState: StateTypes<string>) {
    if (typeof currentState === 'string') {
      return '';
    }

    return this.stateNames.createName(currentState.type);
  }

  private getIntegrationTask(
    handler: IntegrationStateProps<any> & LambdaMetadata
  ): Partial<StateTask> {
    const task: Partial<StateTask> = {
      Resource: `arn:aws:states:::${handler.integrationService}:${handler.action}${handler.mode ? `.${mapIntegrationMode[handler.mode]}` : ''}`,
    };
    const resource: Record<
      string,
      (event: Record<string, any>, context: GetResourceProps) => any
    > = new this.resource();

    this.unresolvedDependency = true;

    task.Arguments = async () => {
      const argumentValues = await resolveCallbackResource((props) =>
        resource[handler.name]({}, props)
      );

      if (!argumentValues) {
        throw new Error('The schema has a unresolved dependency');
      }

      return argumentValues;
    };

    return task;
  }

  private getLambdaTask(
    handler: LambdaStateProps<any> & LambdaMetadata
  ): Partial<StateTask> {
    const id = `${handler.name}-${this.resourceMetadata.name}`;

    const lambdaHandler = this.lambdaStates.createLambda([
      this.scope,
      id,
      {
        ...handler,
        originalName: this.resourceMetadata.originalName,
        filename: this.resourceMetadata.filename,
        foldername: this.resourceMetadata.foldername,
        suffix: 'states',
      },
    ]);
    return {
      Resource: 'arn:aws:states:::lambda:invoke',
      Arguments: {
        Payload: this.getLambdaPayload(handler.name),
        FunctionName: lambdaHandler.functionName,
      },
    };
  }

  private addTaskState(handler: LambdaStateMetadata) {
    const stateName = this.stateNames.createName(handler.name);
    if (this.states[stateName]) {
      return handler.name;
    }

    const task: StateTask = {
      Type: 'Task',
      Resource: '',
      Arguments: {},
      Next: this.getNextState(handler.next, handler.end),
      End: handler.end,
      Assign: handler.assign,
      Output:
        handler.output ||
        '{% $exist($states.result.Payload) ? $states.result.Payload : {} %}',
      ...(handler.integrationService !== undefined
        ? this.getIntegrationTask(handler)
        : this.getLambdaTask(handler)),
    };

    this.states[stateName] = task;
    this.addRetryAndCatch(handler, stateName);
    return stateName;
  }

  private getLambdaPayload(stateName: string) {
    const params =
      getMetadataPrototypeByKey<
        Record<string, StateMachineStringParam | StateMachineObjectParam>
      >(this.resource, LambdaReflectKeys.event_param) || {};

    const paramsByMethod = params[stateName];
    if (!paramsByMethod) {
      return {};
    }

    if (paramsByMethod.type === 'String') {
      return paramsByMethod.initialValue || '';
    }

    const stateParameters: Record<string, string> = {};

    for (const param of paramsByMethod.properties) {
      stateParameters[param.name] = this.parseArgumentParam(param);
    }

    return stateParameters;
  }

  private parseArgumentParam = (field: StateMachineParamMetadata) => {
    const { context } = field;

    switch (context) {
      case 'custom': {
        if (field.type !== 'Object') {
          return field.value;
        }

        const params: Record<string, any> = {};

        if (field.type === 'Object') {
          for (const property of field.properties) {
            params[property.destinationName] = this.parseArgumentParam(property);
          }
        }

        return params;
      }
      case 'input': {
        return `{% $states.input.${field.source} %}`;
      }
      case 'execution': {
        const source = mapSourceExecution[field.source];

        return `{% $states.context.Execution.${field.source.startsWith('input.') ? field.source.replace('input.', 'Input.') : source} %}`;
      }
      case 'state_machine': {
        const source = mapSourceStateMachine[field.source as StateMachineSource];

        return `{% $states.context.StateMachine.${source} %}`;
      }
      case 'state': {
        const source = mapSourceState[field.source as StateSource];

        return `{% $states.context.State.${source} %}`;
      }
      case 'task': {
        const source = mapSourceTask[field.source as TaskSource];

        return `{% $states.context.Task.${source} %}`;
      }
      case 'jsonata': {
        return field.value;
      }
    }
  };

  private getParallelArguments(args?: Record<string, any> | ClassResource) {
    if (!args || typeof args === 'object') {
      return args;
    }

    const params = getMetadataPrototypeByKey<StateMachineParamMetadata[]>(
      args,
      stateMachineFieldKey
    );

    const parallelArguments: Record<string, any> = {};

    for (const param of params) {
      parallelArguments[param.destinationName] = this.parseArgumentParam(param);
    }

    return parallelArguments;
  }

  private addRetry(state: RetryCatchTypes<any>, stateName: string) {
    if (!state.retry || state.retry.length === 0) {
      return;
    }

    const retries: Retry[] = [];

    for (const retry of state.retry || []) {
      retries.push({
        ErrorEquals: retry.errorEquals,
        BackoffRate: retry.backoffRate,
        IntervalSeconds: retry.intervalSeconds,
        MaxAttempts: retry.maxAttempt,
        MaxDelaySeconds: retry.maxDelaySeconds,
      });
    }

    const currentState = this.states[stateName] as StatesWithCatchErrors;
    currentState.Retry = retries;

    this.states[stateName] = currentState;
  }

  private addCatch(state: RetryCatchTypes<any>, stateName: string) {
    if (!state.catch || state.catch.length === 0) {
      return;
    }

    const catches: Catch[] = [];

    for (const catchValue of state.catch || []) {
      catches.push({
        ErrorEquals: catchValue.errorEquals,
        Next: this.getNextState(catchValue.next) as string,
      });
    }

    const currentState = this.states[stateName] as StatesWithCatchErrors;
    currentState.Catch = catches;

    this.states[stateName] = currentState;
  }

  private addRetryAndCatch(state: RetryCatchTypes<any>, stateName: string) {
    this.addCatch(state, stateName);
    this.addRetry(state, stateName);
  }

  private setUnresolvedDependency(unresolved: boolean) {
    if (!this.unresolvedDependency || !unresolved) {
      return;
    }

    this.unresolvedDependency = true;
  }

  private mergeBucketPermissions(bucketPermissions: BucketPermission) {
    for (const bucket in bucketPermissions) {
      this.addBucketPermission(bucket, bucketPermissions[bucket]);
    }
  }

  private addBucketPermission(bucketName: string, permission: PermissionType) {
    if (!this.bucketPermissions[bucketName]) {
      this.bucketPermissions[bucketName] = permission;
      return;
    }

    if (this.bucketPermissions[bucketName] === 'read' && permission === 'write') {
      this.bucketPermissions[bucketName] = permission;
    }
  }
}
