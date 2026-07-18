import type { JsonSchema } from '../model/model.types';

/**
 * Minimal set of OpenAPI 3.0 structures needed to assemble the
 * `aws_api_gateway_rest_api.body` document, including the API Gateway
 * `x-amazon-apigateway-*` vendor extensions.
 */

export type ParameterLocation = 'query' | 'path' | 'header' | 'cookie';

export interface ParameterObject {
  name: string;
  in: ParameterLocation;
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}

export interface MediaTypeObject {
  schema?: JsonSchema;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description: string;
  headers?: Record<string, { schema: JsonSchema }>;
  content?: Record<string, MediaTypeObject>;
}

/**
 * API Gateway integration response entry inside
 * `x-amazon-apigateway-integration.responses`.
 */
export interface XAmazonIntegrationResponse {
  statusCode: string;
  responseTemplates?: Record<string, string>;
  responseParameters?: Record<string, string>;
}

/**
 * `x-amazon-apigateway-integration` extension object.
 */
export interface XAmazonIntegration {
  type: 'aws' | 'aws_proxy' | 'http' | 'http_proxy' | 'mock';
  httpMethod?: string;
  uri?: string;
  credentials?: string;
  passthroughBehavior?: string;
  contentHandling?: string;
  requestTemplates?: Record<string, string>;
  requestParameters?: Record<string, string>;
  responses?: Record<string, XAmazonIntegrationResponse>;
  responseTransferMode?: string;
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
  'x-amazon-apigateway-integration'?: XAmazonIntegration;
  'x-amazon-apigateway-request-validator'?: string;
}

export type PathItemObject = Partial<Record<string, OperationObject>>;

export interface XAmazonAuthorizer {
  type: 'request' | 'token' | 'cognito_user_pools';
  authorizerUri?: string;
  authorizerResultTtlInSeconds?: number;
  identitySource?: string;
  providerARNs?: string[];
}

export interface SecuritySchemeObject {
  type: 'apiKey';
  name: string;
  in: ParameterLocation;
  'x-amazon-apigateway-authtype'?: string;
  'x-amazon-apigateway-authorizer'?: XAmazonAuthorizer;
}

export interface RequestValidatorObject {
  validateRequestBody: boolean;
  validateRequestParameters: boolean;
}

export interface OpenApiDocument {
  openapi: '3.0.1';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItemObject>;
  components: {
    schemas?: Record<string, JsonSchema>;
    securitySchemes?: Record<string, SecuritySchemeObject>;
  };
  'x-amazon-apigateway-request-validators'?: Record<string, RequestValidatorObject>;
  'x-amazon-apigateway-binary-media-types'?: string[];
  'x-amazon-apigateway-minimum-compression-size'?: number;
  'x-amazon-apigateway-api-key-source'?: string;
}
