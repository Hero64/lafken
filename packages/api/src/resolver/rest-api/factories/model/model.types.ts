import type { ApiGatewayModel } from '@cdktn/provider-aws/lib/api-gateway-model';
import type { ITerraformDependable } from 'cdktn';
import type { ApiFieldMetadata } from '../../../../main';

export interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  example?: unknown;
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
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;

  [extension: `x-${string}`]: unknown;
}

export interface CreateModelResponse {
  model?: ApiGatewayModel;
  schema: JsonSchema;
}

export interface GetModelProps {
  field: ApiFieldMetadata;
  dependsOn?: ITerraformDependable[];
  defaultModelName?: string;
}
