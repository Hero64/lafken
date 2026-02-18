import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { lafkenResource } from '@lafken/resolver';

export const LafkenIntegration = lafkenResource.make(ApiGatewayIntegration);
