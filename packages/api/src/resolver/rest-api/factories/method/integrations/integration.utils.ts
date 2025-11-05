import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';

export const AlicantoIntegration = alicantoResource.make(ApiGatewayIntegration);
