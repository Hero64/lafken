import type { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import type { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import type { ClassResource } from '@lafken/common';
import type { Construct } from 'constructs';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../../main';
import type { RestApi } from '../../../../resolver.types';
import type { ResponseObject, XAmazonIntegration } from '../../openapi/openapi.types';
import type { IntegrationHelper } from '../helpers/integration/integration';
import type { ParamHelper } from '../helpers/param/param';
import type { ProxyHelper } from '../helpers/proxy/proxy';
import type { ResponseHelper } from '../helpers/response/response';
import type { ResponseTemplateHelper } from '../helpers/response-template/response-template';
import type { TemplateHelper } from '../helpers/template/template';

export interface Integration {
  create: () => Promise<ApiGatewayIntegration> | ApiGatewayIntegration;
  /**
   * Openapi-mode builder: returns the `x-amazon-apigateway-integration`
   * fragment and operation responses instead of creating an
   * `ApiGatewayIntegration` resource. Side resources (roles, lambdas) are still
   * created.
   */
  createOpenApi?: () => Promise<OpenApiIntegrationResult> | OpenApiIntegrationResult;
}

/**
 * Fragments an integration contributes to an openapi operation: the
 * `x-amazon-apigateway-integration` object and the operation `responses` map.
 */
export interface OpenApiIntegrationResult {
  integration: XAmazonIntegration;
  responses: Record<string, ResponseObject>;
}

/**
 * Props for building an openapi integration fragment. No `ApiGatewayMethod`
 * exists in openapi mode, so it is omitted; the route method comes from
 * `handler.method`.
 */
export type OpenApiIntegrationProps = Omit<IntegrationProps, 'apiGatewayMethod'>;

export interface IntegrationProps {
  scope: Construct;
  restApi: RestApi;
  handler: ApiLambdaMetadata;
  paramHelper: ParamHelper;
  templateHelper: TemplateHelper;
  responseHelper: ResponseHelper;
  integrationHelper: IntegrationHelper;
  responseTemplateHelper: ResponseTemplateHelper;
  apiGatewayMethod: ApiGatewayMethod;
  resourceMetadata: ApiResourceMetadata;
  proxyHelper: ProxyHelper;
  classResource: ClassResource;
}

export type InitializedClass<R> = Record<
  string,
  (event: Record<string, any>, context: any) => R
>;

export const JSON_TYPE = 'application/json';
