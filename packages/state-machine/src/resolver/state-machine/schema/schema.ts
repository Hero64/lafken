import {
  type ClassResource,
  FieldProperties,
  getMetadataPrototypeByKey,
  getResourceHandlerMetadata,
  getResourceMetadata,
  LambdaReflectKeys,
} from '@alicanto/common';
import { lambdaAssets } from '@alicanto/resolver';
import type { Construct } from 'constructs';
import type {
  LambdaStateMetadata,
  RetryCatchTypes,
  StateMachineObjectParam,
  StateMachineParamMetadata,
  StateMachineResourceMetadata,
  StateMachineSource,
  StateMachineStringParam,
  StateSource,
  StateTypes,
  TaskSource,
} from '../../../main';
import type {
  Catch,
  ChoiceCondition,
  ExecutionType,
  ItemProcessor,
  ItemReader,
  ItemReaderTypes,
  MapTask,
  ParallelBranch,
  Retry,
  SchemaProps,
  States,
  StatesWithCatchErrors,
} from './schema.types';
import {
  LambdaStates,
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

  constructor(
    private scope: Construct,
    private resource: ClassResource,
    props: SchemaProps = {}
  ) {
    this.stateNames = props.stateNames || new StateNames();
    this.lambdaStates = props.lambdas || new LambdaStates();

    this.getMetadata(props.initializeAssets ?? false);
  }

  public getDefinition() {
    const startName = this.getNextState(this.resourceMetadata.startAt);

    return {
      StartAt: startName as string,
      States: this.states,
    };
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
      return this.addLambdaState(this.handlers[currentState]);
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
        const mapState = mapSchema.getDefinition();

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

  private addLambdaState(handler: LambdaStateMetadata) {
    const stateName = this.stateNames.createName(handler.name);
    if (this.states[stateName]) {
      return handler.name;
    }

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

    this.states[stateName] = {
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Next: this.getNextState(handler.next, handler.end),
      End: handler.end,
      Arguments: {
        Payload: this.getLambdaPayload(handler.name),
        FunctionName: lambdaHandler.functionName,
      },
      Assign: handler.assign,
      Output: handler.output || '{% $states.result.Payload %}',
    };

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
      FieldProperties.field
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
}
