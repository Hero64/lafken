import {
  type ClassResource,
  FieldProperties,
  getMetadataPrototypeByKey,
  getResourceHandlerMetadata,
  getResourceMetadata,
  LambdaReflectKeys,
} from '@alicanto/common';
import { LambdaHandler } from '@alicanto/resolver';
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
  States,
  StatesWithCatchErrors,
} from './schema.types';
import {
  mapSourceExecution,
  mapSourceState,
  mapSourceStateMachine,
  mapSourceTask,
} from './schema.utils';

export class Schema {
  private states: Record<string, States> = {};
  private resourceMetadata: StateMachineResourceMetadata;
  private handlers: Record<string, LambdaStateMetadata> = {};
  private stateNameCount: Record<string, number> = {};

  constructor(
    private scope: Construct,
    private resource: ClassResource
  ) {
    this.getMetadata();
  }

  public async create() {
    const startName = await this.getNextState(this.resourceMetadata.startAt);

    return {
      StartAt: startName as string,
      States: this.states,
    };
  }

  private getMetadata() {
    this.resourceMetadata = getResourceMetadata<StateMachineResourceMetadata>(
      this.resource
    );
    this.handlers = getResourceHandlerMetadata<LambdaStateMetadata>(this.resource).reduce(
      (acc, handler) => {
        acc[handler.name] = handler;
        return acc;
      },
      {} as Record<string, LambdaStateMetadata>
    );
  }

  private async getNextState(currentState?: StateTypes<string>, end = false) {
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
          Next: await this.getNextState(currentState.next),
        };
        break;
      }
      case 'choice': {
        const choices: ChoiceCondition[] = [];

        for (const choice of currentState.choices) {
          choices.push({
            Condition: choice.condition,
            Next: (await this.getNextState(choice.next)) as string,
          });
        }

        this.states[stateName] = {
          Type: 'Choice',
          Choices: choices,
          Default: await this.getNextState(currentState.default),
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
          Next: await this.getNextState(currentState.next, currentState.end),
        };
        break;
      }
      case 'parallel': {
        const branchStates: ParallelBranch[] = [];

        for (const branch of currentState.branches) {
          const branchSchema = new Schema(this.scope, branch);
          branchStates.push(await branchSchema.create());
        }

        this.states[stateName] = {
          Type: 'Parallel',
          Arguments: this.getParallelArguments(currentState.arguments),
          Output: currentState.output,
          Assign: currentState.assign,
          End: currentState.end,
          Next: await this.getNextState(currentState.next, currentState.end),
          Branches: branchStates,
        };
        await this.addRetryAndCatch(currentState, stateName);
        break;
      }
      case 'map': {
        const mapSchema = new Schema(this.scope, currentState.states);
        const mapState = await mapSchema.create();

        const itemProcessor: Partial<ItemProcessor> = {
          ...mapState,
          ProcessorConfig: {
            Mode: 'INLINE',
          },
        };

        const mapTask: MapTask = {
          Type: 'Map',
          ItemProcessor: itemProcessor as ItemProcessor,
          End: currentState.end,
          Next: await this.getNextState(currentState.next, currentState.end),
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
              Parameters: {
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
        await this.addRetryAndCatch(currentState, stateName);

        break;
      }
    }

    return stateName;
  }

  private getStateName(currentState: StateTypes<string>) {
    if (typeof currentState === 'string') {
      return '';
    }

    this.stateNameCount[currentState.type] ??= 0;
    this.stateNameCount[currentState.type]++;
    return `${currentState.type}-${this.stateNameCount[currentState.type]}`;
  }

  private async addLambdaState(handler: LambdaStateMetadata) {
    if (this.states[handler.name]) {
      return handler.name;
    }

    const id = `${handler.name}-${this.resourceMetadata.name}`;
    const lambdaHandler = new LambdaHandler(this.scope, id, {
      ...handler,
      filename: this.resourceMetadata.filename,
      pathName: this.resourceMetadata.foldername,
      minify: this.resourceMetadata.minify,
      suffix: 'states',
    });

    const lambda = await lambdaHandler.generate();

    this.states[handler.name] = {
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Next: await this.getNextState(handler.next, handler.end),
      End: handler.end,
      Arguments: {
        Payload: this.getLambdaPayload(handler.name),
        FunctionName: lambda.functionName,
      },
      Assign: handler.assign,
      Output: handler.output,
    };

    await this.addRetryAndCatch(handler, handler.name);
    return handler.name;
  }

  private getLambdaPayload(stateName: string) {
    const params = getMetadataPrototypeByKey<
      Record<string, StateMachineStringParam | StateMachineObjectParam>
    >(this.resource, LambdaReflectKeys.event_param);

    const paramsByMethod = params[stateName];
    if (!paramsByMethod) {
      return {};
    }

    console.log(params);

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

  private async addCatch(state: RetryCatchTypes<any>, stateName: string) {
    if (!state.catch || state.catch.length === 0) {
      return;
    }

    const catches: Catch[] = [];

    for (const catchValue of state.catch || []) {
      catches.push({
        ErrorEquals: catchValue.errorEquals,
        Next: (await this.getNextState(catchValue.next)) as string,
      });
    }

    const currentState = this.states[stateName] as StatesWithCatchErrors;
    currentState.Catch = catches;

    this.states[stateName] = currentState;
  }

  private async addRetryAndCatch(state: RetryCatchTypes<any>, stateName: string) {
    this.addCatch(state, stateName);
    await this.addRetry(state, stateName);
  }
}
