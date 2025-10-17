import type {
  ArrayField,
  BooleanField,
  NumberField,
  ObjectField,
  StringField,
} from '@alicanto/common';

export type JsonAtaString = `{%${string}%}`;
export type ExecutionSource =
  | 'id'
  | `input.${string}`
  | 'name'
  | 'role_arn'
  | 'start_time'
  | 'redrive_count'
  | 'redrive_time';

export type StateMachineSource = 'id' | 'name';
export type StateSource = 'entered_time' | 'name' | 'retry_count';
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
};

export type InputParamContext = ParamContextBase<'input', string>;
export type ExecutionParamContext = ParamContextBase<'execution', ExecutionSource>;
export type StateParamContext = ParamContextBase<'state', StateSource>;
export type StateMachineParamContext = ParamContextBase<
  'state_machine',
  StateMachineSource
>;
export type TaskParamContext = ParamContextBase<'task', TaskSource>;
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

export type JsonAtaParamContext = {
  context: 'jsonata';
  /**
   * A simple value
   */
  value: JsonAtaString;
};

export type ParamContext =
  | ExecutionParamContext
  | InputParamContext
  | StateParamContext
  | StateMachineParamContext
  | TaskParamContext
  | CustomParamContext
  | JsonAtaParamContext;

export type ParamProps = {
  /**
   * Name of property
   *
   * @default class property name
   */
  name?: string;
} & ParamContext;

export type StateMachineParamBase = {
  context: ParamContext['context'];
  value: any;
  source: any;
  name: string;
};

export type StateMachineStringParam = StringField & StateMachineParamBase;

export type StateMachineNumberParam = NumberField & StateMachineParamBase;

export type StateMachineBooleanParam = BooleanField & StateMachineParamBase;

export type StateMachineObjectParam = Omit<ObjectField, 'properties'> &
  StateMachineParamBase & {
    properties: StateMachineParamMetadata[];
  };

export type StateMachineArrayParam = Omit<ArrayField, 'items'> &
  StateMachineParamBase & {
    items: StateMachineParamMetadata;
  };

export type StateMachineParamMetadata =
  | StateMachineStringParam
  | StateMachineNumberParam
  | StateMachineBooleanParam
  | StateMachineObjectParam
  | StateMachineArrayParam;
