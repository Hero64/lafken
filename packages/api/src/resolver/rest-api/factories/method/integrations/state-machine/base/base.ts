import { Method } from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';
import type { StateMachineIntegrationBaseProps } from './base.types';

export class StateMachineBaseIntegration<T> implements Integration {
  constructor(protected props: StateMachineIntegrationBaseProps<T>) {}

  public async create() {
    const { restApi, apiGatewayMethod } = this.props;

    const compute = await this.compute();

    const integration = new LafkenIntegration(restApi, `${compute.name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: compute.uri,
      credentials: compute.role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': compute.requestTemplate,
      },
    });

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      compute.responseHandlers,
      compute.name,
      this.props.cors
    );

    return integration;
  }

  public async createOpenApi(): Promise<OpenApiIntegrationResult> {
    const { restApi } = this.props;

    const compute = await this.compute();

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        compute.responseHandlers,
        compute.name,
        this.props.cors
      );

    const integration = toXAmazonIntegration(
      {
        type: 'AWS',
        integrationHttpMethod: Method.POST,
        uri: compute.uri,
        credentials: compute.role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestTemplates: {
          'application/json': compute.requestTemplate,
        },
      },
      integrationResponses
    );

    return { integration, responses: operationResponses };
  }

  private async compute() {
    const {
      handler,
      restApi,
      action,
      service,
      resourceMetadata,
      responseHelper,
      responseTemplateHelper,
      integrationHelper,
      createTemplate,
    } = this.props;

    const integrationResponse = await this.callIntegrationMethod<T>();

    const name = `${resourceMetadata.name}-${handler.name}`;

    const role = integrationHelper.createRole({
      name,
      service,
      scope: restApi,
      additionalServices: handler.additionalServices,
    });

    return {
      name,
      role,
      uri: this.getUri(action),
      requestTemplate: createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
    };
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper } = this.props;

    const resource: InitializedClass<R> = new classResource();

    return resource[handler.name](proxyHelper.createEvent());
  }

  private getUri(action: string) {
    const { restApi } = this.props;
    return `arn:aws:apigateway:${restApi.regionRef}:states:action/${action}`;
  }

  protected getResponseValue(value: any, quoteType = '"') {
    const { proxyHelper, paramHelper, templateHelper } = this.props;
    const responseValue = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    return templateHelper.getTemplateFromProxyValue(responseValue, quoteType);
  }
}
