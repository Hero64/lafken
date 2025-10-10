import type {
  AllowedTypesWithoutFunction,
  ArrayField,
  BasicTypes,
  BooleanField,
  FieldProps,
  NumberField,
  ObjectField,
  StringField,
} from '@alicanto/common';

interface ApiFieldValidatorBase {
  required?: boolean;
}

interface ApiFieldValidatorString extends ApiFieldValidatorBase {
  minLength?: number;
  maxLength?: number;
  format?: 'date' | 'date-time' | 'password' | 'byte' | 'binary';
  pattern?: string;
  enum?: string[];
}

interface ApiFieldValidatorNumber extends ApiFieldValidatorBase {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  multipleOf?: number;
}

export interface ApiStringField extends StringField {
  validation: ApiFieldValidatorString;
}

export interface ApiStringParam extends ApiStringField {
  source: Source;
}
export interface ApiNumberField extends NumberField {
  validation: ApiFieldValidatorNumber;
}

export interface ApiNumberParam extends ApiNumberField {
  source: Source;
  validation: ApiFieldValidatorNumber;
}
export interface ApiBooleanField extends BooleanField {
  validation: ApiFieldValidatorBase;
}
export interface ApiBooleanParam extends ApiBooleanField {
  source: Source;
}
export interface ApiObjectField extends Omit<ObjectField, 'properties'> {
  validation: ApiFieldValidatorBase;
  properties: ApiFieldMetadata[];
}
export interface ApiObjectParam extends Omit<ApiObjectField, 'properties'> {
  source: Source;
  properties: ApiParamMetadata[];
}
export interface ApiArrayField extends Omit<ArrayField, 'items'> {
  validation: ApiFieldValidatorBase;
  items: ApiFieldMetadata;
}
export interface ApiArrayParam extends Omit<ApiArrayField, 'items'> {
  source: Source;
  items: ApiParamMetadata;
}

export type ApiFieldMetadata =
  | ApiStringField
  | ApiNumberField
  | ApiBooleanField
  | ApiObjectField
  | ApiArrayField;

export type ApiParamMetadata =
  | ApiStringParam
  | ApiNumberParam
  | ApiBooleanParam
  | ApiObjectParam
  | ApiArrayParam;

export interface ApiFieldBaseProps extends FieldProps {
  validation?: ApiFieldValidatorString | ApiFieldValidatorNumber | ApiFieldValidatorBase;
}

export interface BodyParamProps extends ApiFieldBaseProps {
  /**
   * Source of the field value.
   *
   * Specifies where the value of this field should be retrieved from
   * in the API request.
   */
  source: 'body';
}

export interface PathParamProps extends Omit<ApiFieldBaseProps, 'type' | 'validation'> {
  /**
   * Source of the field value.
   *
   * Specifies where the value of this field should be retrieved from
   * in the API request.
   */
  source?: 'path';
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
  type?: BasicTypes;
  validation?: ApiFieldValidatorBase;
}

export interface QueryHeaderParamProps
  extends Omit<ApiFieldBaseProps, 'type' | 'validation'> {
  /**
   * Source of the field value.
   *
   * Specifies where the value of this field should be retrieved from
   * in the API request.
   */
  source?: 'query' | 'header';
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
  type?: AllowedTypesWithoutFunction;

  validation?: ApiFieldValidatorBase;
}

export interface ContextParamProps
  extends Omit<ApiFieldBaseProps, 'type' | 'validation'> {
  /**
   * Source of the field value.
   *
   * Specifies where the value of this field should be retrieved from
   * in the API request.
   */
  source?: 'context';
  /**
   * Context value name.
   *
   * Specifies which context property should be used when the
   * `source` is set to `"context"`. These values are provided
   * by API Gateway during the request execution.
   */
  name:
    | 'accountId'
    | 'apiId'
    | 'authorizer.principalId'
    | 'domainName'
    | 'httpMethod'
    | 'identity.apiKey'
    | 'identity.apiKeyId'
    | 'identity.sourceIp'
    | 'path'
    | 'protocol'
    | 'requestId'
    | 'resourcePath';
  validation?: never;
}

export type ApiFieldProps =
  | PathParamProps
  | BodyParamProps
  | QueryHeaderParamProps
  | ContextParamProps;

export type Source = Exclude<ApiFieldProps['source'], undefined>;
