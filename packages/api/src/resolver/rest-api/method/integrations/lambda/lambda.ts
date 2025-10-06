import { LambdaHandler } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { Construct } from 'constructs';
import type { Integration, IntegrationProps } from '../integration.types';

export class LambdaIntegration extends Construct implements Integration {
  constructor(
    scope: Construct,
    private props: IntegrationProps
  ) {
    super(scope, 'lambda-integration');
  }

  async create() {
    const { handler, resourceMetadata, restApi, apiGatewayMethod } = this.props;

    const lambdaHandler = new LambdaHandler(this, handler.name, {
      ...handler,
      filename: resourceMetadata.filename,
      pathName: resourceMetadata.foldername,
      suffix: 'api',
      principal: 'apigateway.amazonaws.com',
    });

    const lambda = await lambdaHandler.generate();

    new ApiGatewayIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.api.id,
        type: 'AWS_PROXY',
        uri: lambda.invokeArn,
        integrationHttpMethod: 'POST',
      }
    );
  }
}
/**

example;
  greeting - module;
    greeting-api
      lambda-integration
        get
        nuevo
    resolve-module
    bye-api
      lambda


  greeting-api;
    resource



 */
