import type {
  AllowedTypes,
  ArrayField,
  BooleanField,
  GetResourceProps,
  NumberField,
  ObjectField,
  StringField,
} from '@lafken/common';

/**
 * A JSONata expression string enclosed in `{%` ... `%}` delimiters.
 *
 * Used as the value for a `jsonata` param context to perform dynamic
 * data transformations inside a Step Functions state machine.
 *
 * @example
 * '{%$states.input.userId%}'
 */
export type JsonAtaString = `{%${string}%}`;
/**
 * Execution-level attributes available as parameter sources in Step Functions.
 *
 * - `id` — ARN of the execution.
 * - `` input.{string} `` — Dot-notation path into the execution input JSON.
 * - `name` — Name of the execution.
 * - `role_arn` — IAM role ARN used by the execution.
 * - `start_time` — ISO-8601 timestamp when the execution started.
 * - `redrive_count` — Number of times the execution has been redriven.
 * - `redrive_time` — ISO-8601 timestamp of the last redrive.
 */
export type ExecutionSource =
  | 'id'
  | `input.${string}`
  | 'name'
  | 'role_arn'
  | 'start_time'
  | 'redrive_count'
  | 'redrive_time';

/**
 * State-machine-level attributes available as parameter sources.
 *
 * - `id` — ARN of the state machine definition.
 * - `name` — Name of the state machine.
 */
export type StateMachineSource = 'id' | 'name';
/**
 * State-level attributes available as parameter sources.
 *
 * - `entered_time` — ISO-8601 timestamp when the current state was entered.
 * - `name` — Name of the current state.
 * - `retry_count` — Number of retry attempts for the current state.
 */
export type StateSource = 'entered_time' | 'name' | 'retry_count';
/**
 * Task-level attributes available as parameter sources.
 *
 * - `token` — Unique task token used for `.waitForTaskToken` integration patterns.
 */
export type TaskSource = 'token';

type ParamContextBase<C, T> = {
  /**
   * Identifies the context where the source is obtain
   */
  context: C;
  /**
   * Value or context parameter
   */
  source: T;
  /**
   * Field data type.
   *
   * Specifies the type of the field. By default, the type is inferred
   * from the property that decorates the field. However, it can be
   * explicitly set to a primitive type such as `String`, `Number`,
   * `Boolean`, or to another payload type.
   *
   * This ensures correct parsing, validation, and serialization of the field's value.
   */
  type?: AllowedTypes;
};

/**
 * Parameter context that references a field from the state's input JSON.
 *
 * Use a dot-notation string as `source` to target a nested property.
 *
 * @example
 * { context: 'input', source: 'user.id' }
 */
export type InputParamContext = ParamContextBase<'input', string>;
/**
 * Parameter context that references data from the current Step Functions execution.
 *
 * Use this to bind a parameter to a specific execution-level attribute, such as the
 * execution ID, name, IAM role ARN, start time, input path, or redrive metadata.
 *
 * @example
 * // Bind a parameter to the execution ID
 * { context: 'execution', source: 'id' }
 *
 * @example
 * // Bind a parameter to a nested input field
 * { context: 'execution', source: 'input.userId' }
 *
 * @see {@link ExecutionSource} for all available source values.
 */
export type ExecutionParamContext = ParamContextBase<'execution', ExecutionSource>;
/**
 * Parameter context that references data from the currently executing state.
 *
 * @example
 * { context: 'state', source: 'name' }
 *
 * @see {@link StateSource} for all available source values.
 */
export type StateParamContext = ParamContextBase<'state', StateSource>;
/**
 * Parameter context that references a top-level attribute of the state machine definition.
 *
 * @example
 * { context: 'state_machine', source: 'id' }
 *
 * @see {@link StateMachineSource} for all available source values.
 */
export type StateMachineParamContext = ParamContextBase<
  'state_machine',
  StateMachineSource
>;
/**
 * Parameter context that exposes task-level attributes, primarily used for
 * `.waitForTaskToken` integration patterns where a callback token must be
 * forwarded to an external system.
 *
 * @example
 * { context: 'task', source: 'token' }
 */
export type TaskParamContext = ParamContextBase<'task', TaskSource>;
/**
 * Parameter context for supplying an arbitrary static or computed value
 * that does not originate from execution, state, or task runtime data.
 */
export type CustomParamContext = {
  context: 'custom';
  /**
   * A simple value
   */
  value?: any;
  /**
   * You can extend this value with other
   */
  type?: String | Number | Boolean | Function;
};

/**
 * Parameter context for evaluating a JSONata expression at runtime.
 *
 * The `value` must be a {@link JsonAtaString} — a template enclosed in `{%` ... `%}`.
 *
 * @example
 * { context: 'jsonata', value: '{%$states.input.price * 1.2%}' }
 */
export type JsonAtaParamContext = {
  context: 'jsonata';
  /**
   * A simple value
   */
  value: JsonAtaString;
};

/**
 * Union of all supported parameter context types that can be used with the
 * `@Param` decorator to bind a state machine parameter to a runtime value source.
 */
export type ParamContext =
  | ExecutionParamContext
  | InputParamContext
  | StateParamContext
  | StateMachineParamContext
  | TaskParamContext
  | CustomParamContext
  | JsonAtaParamContext;

/**
 * Props accepted by the `@Param` decorator. Combines an optional display name
 * with one of the supported {@link ParamContext} variants.
 */
export type ParamProps = {
  /**
   * Name of property
   *
   * @default class property name
   */
  name?: string;
} & ParamContext;

/**
 * Internal base shape for all resolved state machine parameter metadata.
 * Produced by the resolver after processing `@Param` decorator metadata.
 */
export type StateMachineParamBase = {
  /** Context type discriminant (e.g. `'execution'`, `'input'`, `'custom'`). */
  context: ParamContext['context'];
  /** Resolved static value (used by `custom` and `jsonata` contexts). */
  value: any;
  /** Runtime source path within the chosen context. */
  source: any;
  /** Parameter name as it will appear in the Step Functions parameter map. */
  name: string;
};

/** Resolved metadata for a string-typed state machine parameter. */
export type StateMachineStringParam = StringField & StateMachineParamBase;

/** Resolved metadata for a number-typed state machine parameter. */
export type StateMachineNumberParam = NumberField & StateMachineParamBase;

/** Resolved metadata for a boolean-typed state machine parameter. */
export type StateMachineBooleanParam = BooleanField & StateMachineParamBase;

/**
 * Resolved metadata for an object-typed state machine parameter.
 * Nested `properties` are recursively described as {@link StateMachineParamMetadata}.
 */
export type StateMachineObjectParam = Omit<ObjectField, 'properties'> &
  StateMachineParamBase & {
    properties: StateMachineParamMetadata[];
  };

/**
 * Resolved metadata for an array-typed state machine parameter.
 * The element schema is described by a single {@link StateMachineParamMetadata} entry.
 */
export type StateMachineArrayParam = Omit<ArrayField, 'items'> &
  StateMachineParamBase & {
    items: StateMachineParamMetadata;
  };

/**
 * Discriminated union of all resolved parameter metadata shapes.
 * Used by the resolver to build the Step Functions parameter map for a state.
 */
export type StateMachineParamMetadata =
  | StateMachineStringParam
  | StateMachineNumberParam
  | StateMachineBooleanParam
  | StateMachineObjectParam
  | StateMachineArrayParam;

/**
 * Parameters passed to integration options when configuring a state machine
 * task integration (e.g. Lambda, SQS, DynamoDB).
 *
 * Alias of {@link GetResourceProps} from `@lafken/common`.
 */
export type IntegrationOptionsParams = GetResourceProps;
