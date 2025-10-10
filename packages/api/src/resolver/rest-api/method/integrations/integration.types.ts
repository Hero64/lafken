import type { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../main';
import type { RestApi } from '../../rest-api';
import type { ParamHelper } from '../helpers/param/param';
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
  apiGatewayMethod: ApiGatewayMethod;
  resourceMetadata: ApiResourceMetadata;
}

export const JSON_TYPE = 'application/json';
