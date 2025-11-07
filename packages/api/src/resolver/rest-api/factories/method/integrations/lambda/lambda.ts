import { LambdaHandler } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import type { Integration, IntegrationProps } from '../integration.types';

export class LambdaIntegration implements Integration {
  constructor(private props: IntegrationProps) {}

  create() {
    const {
      scope,
      handler,
      resourceMetadata,
      restApi,
      apiGatewayMethod,
      responseHelper,
      paramHelper,
      templateHelper,
    } = this.props;

    const lambdaHandler = new LambdaHandler(
      scope,
      `${handler.name}-${resourceMetadata.name}`,
      {
        ...handler,
        filename: resourceMetadata.filename,
        foldername: resourceMetadata.foldername,
        principal: 'apigateway.amazonaws.com',
        suffix: 'api',
      }
    );

    const integration = new ApiGatewayIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.id,
        type: 'AWS',
        uri: lambdaHandler.invokeArn,
        integrationHttpMethod: 'POST',
        dependsOn: [apiGatewayMethod],
        requestTemplates: paramHelper.params
          ? {
              'application/json': templateHelper.generateTemplate({
                field: paramHelper.params,
              }),
            }
          : undefined,
      }
    );

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      responseHelper.handlerResponse,
      `${resourceMetadata.name}-${handler.name}`
    );

    return integration;
  }
}
