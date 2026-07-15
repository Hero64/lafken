import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import type { XAmazonIntegration } from '../../../openapi/openapi.types';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { isStreamingHandler } from '../integration.utils';
import { buildRequestTemplates, createLambdaHandler } from './lambda.utils';

export class LambdaIntegration implements Integration {
  constructor(private props: IntegrationProps) {}

  /**
   * Openapi-mode builder: emits the lambda `x-amazon-apigateway-integration`
   * fragment and the operation responses. The lambda function/permission are
   * still created as real resources.
   */
  createOpenApi(): OpenApiIntegrationResult {
    const { restApi, resourceMetadata, handler, responseHelper } = this.props;

    const lambdaHandler = createLambdaHandler(this.props);
    const baseName = `${resourceMetadata.name}-${handler.name}`;

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        responseHelper.handlerResponse,
        baseName
      );

    const integration: XAmazonIntegration = {
      type: 'aws',
      httpMethod: 'POST',
      uri: lambdaHandler.invokeArn,
      requestTemplates: buildRequestTemplates(this.props),
      responses: integrationResponses,
      responseTransferMode: isStreamingHandler(this.props) ? 'STREAM' : undefined,
    };

    return { integration, responses: operationResponses };
  }

  create() {
    const { handler, resourceMetadata, restApi, apiGatewayMethod, responseHelper } =
      this.props;

    const lambdaHandler = createLambdaHandler(this.props);

    const integration = new ApiGatewayIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.id,
        type: 'AWS',
        uri: lambdaHandler.invokeArn,
        responseTransferMode: isStreamingHandler(this.props) ? 'STREAM' : undefined,
        integrationHttpMethod: 'POST',
        dependsOn: [apiGatewayMethod, lambdaHandler],
        requestTemplates: buildRequestTemplates(this.props),
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
