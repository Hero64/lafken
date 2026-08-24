import type { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import type { ITerraformDependable } from 'cdktn';
import type {
  ApiAnyMetadata,
  ApiBooleanMetadata,
  ApiNumberMetadata,
  ApiStringMetadata,
  ResponseArrayField,
  ResponseObjectMetadata,
} from '../../../../main';

export type ModelMetadata =
  | Omit<ApiStringMetadata, 'source'>
  | Omit<ApiNumberMetadata, 'source'>
  | Omit<ApiBooleanMetadata, 'source'>
  | Omit<ResponseObjectMetadata, 'source'>
  | Omit<ResponseArrayField, 'source'>
  | Omit<ApiAnyMetadata, 'source'>;

export interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  not?: JsonSchema;
  $ref?: string;
  title?: string;
}

export interface FullJsonSchema extends JsonSchema {
  example?: unknown;
  nullable?: boolean;
  deprecated?: boolean;
  items?: FullJsonSchema | FullJsonSchema[];
  properties?: Record<string, FullJsonSchema>;
  allOf?: FullJsonSchema[];
  oneOf?: FullJsonSchema[];
  anyOf?: FullJsonSchema[];
  not?: FullJsonSchema;
}

export interface CreateModelResponse {
  model?: ApiGatewayModel;
  /**
   * Component reference and name populated in openapi mode (no `ApiGatewayModel`
   * construct is created; the schema is registered as `#/components/schemas`).
   */
  ref?: string;
  name?: string;
  schema: JsonSchema;
  fullSchema: FullJsonSchema;
}

/**
 * Result of resolving a request/response model: `name` is the model/component
 * name, `ref` is the `$ref` to use inside a body (apigateway URL in resource
 * mode, `#/components/schemas/...` in openapi mode).
 */
export interface ModelRef {
  name: string;
  ref: string;
}

export interface GetModelProps {
  field: ModelMetadata;
  dependsOn?: ITerraformDependable[];
  defaultModelName?: string;
}
