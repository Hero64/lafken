import type { ApiGatewayModel } from '@cdktf/provider-aws/lib/api-gateway-model';

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
