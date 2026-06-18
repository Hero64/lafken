import type {
  InitializedClass,
  Integration,
  IntegrationProps,
} from '../integration.types';
import { LafkenIntegration } from '../integration.utils';

export class MockIntegration implements Integration {
  constructor(private props: IntegrationProps) {}

  async create() {
    const {
      classResource,
      handler,
      proxyHelper,
      paramHelper,
      templateHelper,
      restApi,
      apiGatewayMethod,
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
    const statusCode = successResponse.statusCode;

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
      [{ ...successResponse, template: responseTemplate }],
      name
    );

    return integration;
  }
}
