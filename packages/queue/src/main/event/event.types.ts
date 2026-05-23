import type {
  ArrayField,
  BooleanField,
  FieldProps,
  NumberField,
  ObjectField,
  StringField,
} from '@lafken/common';

/**
 * Top-level string fields available on every SQS record that can be
 * extracted with `@Param({ source: 'record' })`.
 */
export type SQSRecordField =
  | 'messageId'
  | 'receiptHandle'
  | 'md5OfBody'
  | 'eventSource'
  | 'eventSourceARN'
  | 'awsRegion';

export interface ParamAttributeProps extends Omit<FieldProps, 'type'> {
  /**
   * Attribute source.
   *
   * Specifies the source from which to obtain the attribute value.
   * This can be used to map values from the event
   * when processing messages.
   */
  source?: 'attribute';
  /**
   * Attribute type.
   *
   * Specifies the data type of the attribute. This can be used to
   * enforce the type of the value extracted from the source before
   * passing it to the consumer or processing logic.
   */
  type?: NumberConstructor | StringConstructor;
}

export interface ParamBodyUnparsedProps extends Omit<FieldProps, 'type'> {
  /**
   * Attribute source.
   *
   * Specifies the source from which to obtain the attribute value.
   * This can be used to map values from the event
   * when processing messages.
   */
  source: 'body';
  /**
   * Parse message body.
   *
   * Specifies whether the message body should be parsed and converted
   * into a JavaScript object before being passed to the consumer.
   */
  parse?: false;
  /**
   * Attribute type.
   *
   * Specifies the data type of the attribute. This can be used to
   * enforce the type of the value extracted from the source before
   * passing it to the consumer or processing logic.
   */
  type?: StringConstructor;
}

export interface ParamBodyParsedProps extends Omit<FieldProps, 'type'> {
  /**
   * Attribute source.
   *
   * Specifies the source from which to obtain the attribute value.
   * This can be used to map values from the event
   * when processing messages.
   */
  source: 'body';
  /**
   * Parse message body.
   *
   * Specifies whether the message body should be parsed and converted
   * into a JavaScript object before being passed to the consumer.
   */
  parse: true;
  /**
   * Attribute type.
   *
   * Specifies the data type of the attribute. This can be used to
   * enforce the type of the value extracted from the source before
   * passing it to the consumer or processing logic.
   */
  type?: StringConstructor | Function | [Function];
}

export interface ParamRecordProps extends Omit<FieldProps, 'type' | 'name'> {
  /**
   * Record source.
   *
   * Extracts a top-level field directly from the raw SQS record object
   * (e.g. `messageId`, `receiptHandle`, `awsRegion`).
   */
  source: 'record';
  /**
   * SQS record field name.
   *
   * Specifies which top-level property of the SQS record to extract.
   * Defaults to the decorated property name when omitted.
   */
  name?: SQSRecordField;
  /**
   * Attribute type.
   *
   * All SQS record metadata fields are strings, so only `String`
   * is accepted here.
   */
  type?: StringConstructor;
}

export type ParamProps =
  | ParamAttributeProps
  | ParamBodyUnparsedProps
  | ParamBodyParsedProps
  | ParamRecordProps;

export type Source = Exclude<ParamProps['source'], undefined>;

interface QueueParamBase {
  source: Source;
  parse: boolean;
}

export interface QueueStringParam extends StringField, QueueParamBase {}

export interface QueueNumberParam extends NumberField, QueueParamBase {}

export interface QueueBooleanParam extends BooleanField, QueueParamBase {}

export interface QueueObjectParam
  extends Omit<ObjectField, 'properties'>,
    QueueParamBase {
  properties: QueueParamMetadata[];
}

export interface QueueArrayParam extends Omit<ArrayField, 'items'>, QueueParamBase {
  items: QueueParamMetadata;
}

export interface QueueRecordParam extends StringField, QueueParamBase {
  source: 'record';
}

export type QueueParamMetadata =
  | QueueStringParam
  | QueueNumberParam
  | QueueBooleanParam
  | QueueObjectParam
  | QueueArrayParam
  | QueueRecordParam;
