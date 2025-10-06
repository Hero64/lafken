import type {
  AllowedTypesWithoutFunction,
  BasicTypes,
  FieldMetadata,
  FieldProps,
  FieldWithClassInformation,
} from '@alicanto/common';

export interface ApiFieldProps extends FieldProps {
  /**
   * Required attribute.
   *
   * Specifies whether this attribute is mandatory in the payload.
   * If set to `true`, the request must include this attribute;
   */
  required?: boolean;
}

export interface ApiFieldMetadata extends FieldMetadata {
  required: boolean;
}

export interface FieldParams extends FieldWithClassInformation<ParamMetadata> {
  source?: Source;
  directValue?: string;
  required?: boolean;
}

export interface ParamPropsBase extends FieldProps {
  /**
   * specify field is required
   * @default true
   */
  required?: boolean;
}

export interface BodyParamProps extends ParamPropsBase {
  /**
   * Source of the field value.
   *
   * Specifies where the value of this field should be retrieved from
   * in the API request.
   */
  source: 'body';
}

export interface PathParamProps extends Omit<ParamPropsBase, 'type'> {
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
}

export interface QueryHeaderParamProps extends Omit<ParamPropsBase, 'type'> {
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
}

export interface ContextParamProps extends Omit<ParamPropsBase, 'type'> {
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
}

export type Source = Exclude<ParamProps['source'], undefined>;

export type ParamProps =
  | PathParamProps
  | BodyParamProps
  | QueryHeaderParamProps
  | ContextParamProps;

export interface ParamMetadata
  extends Omit<FieldMetadata, 'type' | 'source' | 'required'>,
    Omit<Required<ParamProps>, 'type'> {
  directValue?: string;
}
