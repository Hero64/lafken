import type {
  BucketNames,
  ClassResource,
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ResourceProps,
  StateMachineNames,
} from '@alicanto/common';

import type { JsonAtaString } from '../param';

export enum StateMachineReflectKeys {
  nested = 'state_machine:nested',
}

export type DefaultMethod = (...args: any) => any;
export type ProcessorExecutionType = 'STANDARD' | 'EXPRESS';
export type ProcessorMode = 'INLINE' | 'DISTRIBUTED';
export type CsvDelimiter = 'COMMA' | 'PIPE' | 'SEMICOLON' | 'SPACE' | 'TAB';
export type HeaderLocation = 'FIRST_ROW' | 'GIVEN';

export type ResultOutputType = 'JSON' | 'JSONL';
export type ResultTransformation = 'NONE' | 'COMPACT' | 'FLATTEN';

type ObjectOrJsonAta = Record<string, any> | JsonAtaString;

export interface StateMachineBaseProps<T> {
  /**
   * Initial state of the state machine.
   *
   * Specifies which task or state the state machine should start executing first.
   * This defines the entry point of the workflow.
   */
  startAt: InitialStateType<T>;
}

interface StateMachineProps<T> extends StateMachineBaseProps<T> {
  /**
   * Execution type of the state machine.
   *
   * Specifies whether the state machine should be created as a standard
   * or express state machine.
   */
  executionType?: ProcessorExecutionType;
}

interface WaitStateBase<T> {
  /**
   * State type: Wait.
   *
   * Specifies that this state is a `Wait` state, which pauses the execution
   * of the state machine for a defined duration before moving to the next state.
   */
  type: 'wait';
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next: StateTypes<T>;
  /**
   * Assign values to the state context.
   *
   * Specifies a mapping of key-value pairs to add or update in the
   * state machine's context when this state executes.
   * Useful for passing data between states or enriching the context.
   */
  assign?: Record<string, any>;
}

interface WaitStateSeconds<T> extends WaitStateBase<T> {
  /**
   * Wait duration in seconds.
   *
   * Specifies the number of seconds that the state machine should pause
   * when executing a `Wait` state. The value can be provided as:
   * - A number representing seconds.
   * - A JSONata expression to compute the duration dynamically based on the context.
   */
  seconds: number | JsonAtaString;
  timestamp?: never;
}

interface WaitStateTimestamp<T> extends WaitStateBase<T> {
  /**
   * Wait until a specific timestamp.
   *
   * Specifies the date and time at which the state machine should
   * resume execution in a `Wait` state. The value can be provided as:
   * - A string representing a timestamp (ISO 8601 format).
   * - A JSONata expression to compute the timestamp dynamically based on the context.
   */
  timestamp: string;
  seconds?: never;
}

interface ChoiceCondition<T> {
  condition: JsonAtaString;
  /**
   * Conditional expression for state transitions.
   *
   * Specifies a JSONata expression that determines which state
   * should be executed next based on the current context or input.
   */
  next: StateTypes<T>;
}

export interface ChoiceState<T> {
  /**
   * State type: Choice.
   *
   * Specifies that this state is a `Choice` state, which allows
   * conditional branching based on evaluated expressions.
   */
  type: 'choice';
  /**
   * Choice conditions.
   *
   * Specifies an array of conditions that determine the next state
   * to execute based on the current context or input.
   *
   * Each condition is evaluated in order, and the first one that
   * matches will define the next state.
   */
  choices: ChoiceCondition<T>[];
  /**
   * Default state.
   *
   * Specifies the state to transition to if none of the `choices`
   * conditions match during the evaluation.
   */
  default?: StateTypes<T>;
}

interface ParallelState<T> extends CatchAndRetry<T> {
  /**
   * State type: Parallel.
   *
   * Specifies that this state is a `Parallel` state, which allows
   * multiple branches of execution to run simultaneously.
   */
  type: 'parallel';
  /**
   * Parallel branches.
   *
   * Specifies the different branches that will be executed in parallel
   * within a `Parallel` state. Each branch must be a class decorated
   * with `@NestedStateMachine`.
   */
  branches: ClassResource[];
  /**
   * Branch input arguments.
   *
   * Specifies the input data that will be passed to each branch
   * in a `Parallel` state. This can be provided as:
   * - A class decorated with `@Payload`.
   * - A plain object containing key-value pairs.
   */
  arguments?: ClassResource | Record<string, any>;
  /**
   * Assign values to the state context.
   *
   * Specifies a mapping of key-value pairs to add or update in the
   * state machine's context when this state executes.
   * Useful for passing data between states or enriching the context.
   */
  assign?: Record<string, any>;
  /**
   * State output transformation.
   *
   * Allows modifying the output of the state before passing it
   * to the next state. The output can be provided as:
   * - An object to directly shape the output.
   * - A JSONata string expression to compute the output dynamically based on the context.
   */
  output?: ObjectOrJsonAta;
  /**
   * End state indicator.
   *
   * Specifies whether this state is a terminal state, meaning
   * the state machine execution will stop after completing this state.
   */
  end?: boolean;
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next?: StateTypes<T>;
}

interface FailState {
  type: 'fail';
  /**
   * Description about error cause, you can use an jsonata expression
   */
  cause?: string;
  /**
   * Error name, you can use an jsonata expression
   */
  error?: string;
}

interface SucceedState {
  type: 'succeed';
  /**
   * State output transformation.
   *
   * Allows modifying the output of the state before passing it
   * to the next state. The output can be provided as:
   * - An object to directly shape the output.
   * - A JSONata string expression to compute the output dynamically based on the context.
   */
  output?: ObjectOrJsonAta;
}

interface PassState<T> {
  type: 'pass';
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next?: StateTypes<T>;
  /**
   * End state indicator.
   *
   * Specifies whether this state is a terminal state, meaning
   * the state machine execution will stop after completing this state.
   */
  end?: boolean;
  /**
   * State output transformation.
   *
   * Allows modifying the output of the state before passing it
   * to the next state. The output can be provided as:
   * - An object to directly shape the output.
   * - A JSONata string expression to compute the output dynamically based on the context.
   */
  output?: ObjectOrJsonAta;
  /**
   * Assign values to the state context.
   *
   * Specifies a mapping of key-value pairs to add or update in the
   * state machine's context when this state executes.
   * Useful for passing data between states or enriching the context.
   */
  assign?: Record<string, any>;
}

export interface MapStateBase<T> extends CatchAndRetry<T> {
  /**
   * State type: Map.
   *
   * Specifies that this state is a `Map` state, which iterates
   * over a collection of items and executes a set of states for
   * each item individually.
   */
  type: 'map';
  /**
   * Iterator states.
   *
   * Specifies the set of states that will be executed for each item
   * in the collection within a `Map` state. This should be provided
   * as a class decorated with `@NestedStateMachine`.
   */
  states: ClassResource;
  /**
   * Items to iterate.
   *
   * Specifies the collection of elements that the `Map` state
   * will iterate over. This can be provided as:
   * - A static array of items.
   * - A JSONata expression that dynamically computes the items based on the context.
   */
  items?: any[] | JsonAtaString;
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next?: StateTypes<T>;
  /**
   * Maximum concurrency.
   *
   * Specifies the maximum number of items that the `Map` state
   * will process in parallel at the same time.
   */
  maxCurrency?: number;
  /**
   * Item selector.
   *
   * Allows transforming or selecting specific parts of each item
   * before it is processed by the `Map` state. The selector can be provided as:
   * - A static object defining the fields to pick or transform.
   * - A JSONata expression to compute or reshape the item dynamically.
   */
  itemSelector?: ObjectOrJsonAta;
  /**
   * Assign values to the state context.
   *
   * Specifies a mapping of key-value pairs to add or update in the
   * state machine's context when this state executes.
   * Useful for passing data between states or enriching the context.
   */
  assign?: Record<string, any>;
  /**
   * State output transformation.
   *
   * Allows modifying the output of the state before passing it
   * to the next state. The output can be provided as:
   * - An object to directly shape the output.
   * - A JSONata string expression to compute the output dynamically based on the context.
   */
  output?: ObjectOrJsonAta;
  /**
   * End state indicator.
   *
   * Specifies whether this state is a terminal state, meaning
   * the state machine execution will stop after completing this state.
   */
  end?: boolean;
}

interface MapInline<T> extends MapStateBase<T> {
  /**
   * Execution mode.
   *
   * Specifies that the `Map` state will execute in `inline` mode,
   * meaning all iterations are executed within the same state machine
   * execution rather than spawning separate executions.
   */
  mode: 'inline';
}

interface MapReaderItemBase {
  bucket: BucketNames;
  key: string;
  maxItems?: number;
}

interface MapReaderJSONItem extends MapReaderItemBase {
  source: 'json' | 'jsonl' | 'manifest';
}

interface MapReaderCSVItem extends MapReaderItemBase {
  source: 'csv';
  headers: {
    location: HeaderLocation;
    titles?: string[];
  };
  delimiter?: CsvDelimiter;
}

interface MapWriteResult {
  bucket: BucketNames;
  key: string;
  prefix?: string;
  config?: {
    outputType: 'JSON' | 'JSONL';
    transformation?: 'NONE' | 'COMPACT' | 'FLATTEN';
  };
}

export interface MapDistributed<T> extends MapStateBase<T> {
  /**
   * Execution mode.
   *
   * Specifies that the `Map` state will execute in `distributed` mode,
   * meaning each iteration can be executed as a separate state machine
   * execution, allowing for higher scalability and parallelism.
   */
  mode: 'distributed';
  /**
   * Map execution type.
   *
   * Specifies the type of execution for the `Map` state, determining
   * how iterations are processed:
   * - `standard`: Iterations run within the standard execution mode,
   *   which guarantees exactly-once processing and supports long-running workflows.
   * - `express`: Iterations run in express execution mode, optimized for
   *   high-throughput, short-duration workflows.
   */
  executionType?: 'standard' | 'express';
  /**
   * Map item reader.
   *
   * Specifies the source or format of the items to be processed by
   * the `Map` state.
   */
  itemReader?: MapReaderJSONItem | MapReaderCSVItem;
  /**
   * Map result writer.
   *
   * Specifies how the results of each iteration in the `Map` state
   * will be written or aggregated. The `resultWriter` can be used
   * to control the structure and destination of the output for all items.
   */
  resultWriter?: MapWriteResult;
  /**
   * TODO: agregar descripcion
   */
  maxItemsPerBatch?: number;
}

type MapState<T> = MapInline<T> | MapDistributed<T>;

export type ErrorType =
  | 'States.ALL'
  | 'States.HeartbeatTimeout'
  | 'States.Timeout'
  | 'States.TaskFailed'
  | 'States.Permissions'
  | 'States.ResultPathMatchFailure'
  | 'States.ParameterPathFailure'
  | 'States.QueryEvaluationError'
  | 'States.BranchFailed'
  | 'States.NoChoiceMatched'
  | 'States.IntrinsicFailure'
  | 'States.ExceedToleratedFailureThreshold'
  | 'States.ItemReaderFailed'
  | 'States.ResultWriterFailed'
  | (string & {});

interface StateRetry {
  errorEquals: ErrorType[];
  intervalSeconds?: number;
  maxAttempt?: number;
  backoffRate?: number;
  maxDelaySeconds?: number;
  jitterStrategy?: 'FULL' | 'NONE';
}

interface StateCatch<T> {
  /**
   * Error types to catch or retry.
   *
   * Specifies the list of error names that this `Catch` or `Retry`
   * configuration should handle. Only the errors included in this array
   * will trigger the catch or retry behavior.
   */
  errorEquals: ErrorType[];
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next: T | PassState<T> | SucceedState | FailState;
}

export interface CatchAndRetry<T> {
  /**
   * Retry configuration.
   *
   * Specifies the retry behavior for this state in case of failure.
   * The `retry` property allows defining how many times to retry,
   * the interval between retries, and the backoff strategy.
   */
  retry?: StateRetry[];
  /**
   * Catch configuration.
   *
   * Specifies how errors should be handled for this state. The `catch`
   * property defines one or more handlers that will be invoked if the
   * state fails with a matching error.
   */
  catch?: StateCatch<T>[];
}

export type InitialStateType<T> =
  | T
  | WaitStateTimestamp<T>
  | WaitStateSeconds<T>
  | ChoiceState<T>
  | ParallelState<T>
  | MapState<T>;

export type StateTypes<T> = PassState<T> | FailState | SucceedState | InitialStateType<T>;
export type RetryCatchTypes<T> = LambdaStateMetadata | ParallelState<T> | MapState<T>;

export interface StateProps<T> extends CatchAndRetry<T> {
  /**
   * End state indicator.
   *
   * Specifies whether this state is a terminal state, meaning
   * the state machine execution will stop after completing this state.
   */
  end?: boolean;
  /**
   * Next state to execute.
   *
   * Specifies the next task or state that the state machine should
   * execute after completing the current state.
   */
  next?: StateTypes<T>;
  /**
   * State output transformation.
   *
   * Allows modifying the output of the state before passing it
   * to the next state. The output can be provided as:
   * - An object to directly shape the output.
   * - A JSONata string expression to compute the output dynamically based on the context.
   */
  output?: ObjectOrJsonAta;
  /**
   * Assign values to the state context.
   *
   * Specifies a mapping of key-value pairs to add or update in the
   * state machine's context when this state executes.
   * Useful for passing data between states or enriching the context.
   */
  assign?: Record<string, any>;
}

export interface LambdaStateMetadata<T = {}>
  extends StateProps<keyof T>,
    LambdaMetadata {}

export interface LambdaStateProps<T = {}> extends StateProps<keyof T> {
  /**
   * Lambda configuration.
   *
   * Specifies the properties of a Lambda function to be invoked
   * by this state.
   */
  lambda?: Partial<LambdaProps>;
}

export interface StateMachineResourceProps<T> extends StateMachineProps<T> {
  /**
   * State Machine name.
   *
   * Specifies the name of the state machine. If not provided, a default
   * name based on the class or resource will be used.
   */
  name?: StateMachineNames;
}

export interface StateMachineResourceMetadata
  extends StateMachineProps<any>,
    ResourceMetadata {
  startAt: InitialStateType<string>;
}

export interface NestedStateMachineResourceProps<T>
  extends StateMachineBaseProps<T>,
    ResourceProps {}

export interface NestedStateMachineResourceMetadata
  extends StateMachineBaseProps<any>,
    ResourceMetadata {
  startAt: InitialStateType<string>;
}
