import type {
  InitializedClass,
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../integration.utils';

export class MockIntegration implements Integration {
  constructor(private props: IntegrationProps) {}

  async create() {
    const { restApi, apiGatewayMethod } = this.props;

    const { name, statusCode, responseHandlers } = await this.resolveResponse();

    const integration = new LafkenIntegration(restApi, `${name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'MOCK',
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': `{"statusCode": ${statusCode}}`,
      },
    });

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      responseHandlers,
      name
    );

    return integration;
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    const { restApi } = this.props;

    const { name, statusCode, responseHandlers } = await this.resolveResponse();

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(responseHandlers, name);

    const integration = toXAmazonIntegration(
      {
        type: 'MOCK',
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestTemplates: {
          'application/json': `{"statusCode": ${statusCode}}`,
        },
      },
      integrationResponses
    );

    return { integration, responses: operationResponses };
  }

  private async resolveResponse() {
    const {
      classResource,
      handler,
      proxyHelper,
      paramHelper,
      templateHelper,
      restApi,
      resourceMetadata,
      integrationHelper,
      responseHelper,
    } = this.props;

    const name = `${resourceMetadata.name}-${handler.name}`;
    const { options } = integrationHelper.generateIntegrationOptions(restApi);

    const resource: InitializedClass<Record<string, any>> = new classResource();
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    const responseTemplate = templateHelper.generateTemplateByObject({
      value: integrationResponse,
      resolveValue: (value) =>
        proxyHelper.resolveProxyValue(value, paramHelper.pathParams),
    });

    const [successResponse] = responseHelper.handlerResponse;

    return {
      name,
      statusCode: successResponse.statusCode,
      responseHandlers: [{ ...successResponse, template: responseTemplate }],
    };
  }
}
