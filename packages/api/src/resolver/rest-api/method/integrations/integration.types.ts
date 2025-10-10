import type { ClassResource } from '@alicanto/common';
import type { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../main';
import type { RestApi } from '../../rest-api';
import type { IntegrationHelper } from '../helpers/integration/integration';
import type { ParamHelper } from '../helpers/param/param';
import type { ProxyHelper } from '../helpers/proxy/proxy';
import type { ResponseHelper } from '../helpers/response/response';
import type { TemplateHelper } from '../helpers/template/template';

export interface Integration {
  create: () => void;
}

export interface IntegrationProps {
  fullPath: string;
  restApi: RestApi;
  handler: ApiLambdaMetadata;
  paramHelper: ParamHelper;
  templateHelper: TemplateHelper;
  responseHelper: ResponseHelper;
  integrationHelper: IntegrationHelper;
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
