import type { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../main';
import type { RestApi } from '../../rest-api';
import type { ParamHelper } from '../helpers/param/param';

export interface Integration {
  create: () => void;
}

export interface IntegrationProps {
  resourceMetadata: ApiResourceMetadata;
  handler: ApiLambdaMetadata;
  paramHelper: ParamHelper;
  fullPath: string;
  restApi: RestApi;
  apiGatewayMethod: ApiGatewayMethod;
}

export const JSON_TYPE = 'application/json';
