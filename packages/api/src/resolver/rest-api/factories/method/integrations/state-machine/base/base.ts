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

    if (compute.resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        integration.addOverride(
          'request_templates.application/json',
          await compute.rebuildTemplate()
        );
      });
    }

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      compute.responseHandlers,
      compute.name
    );

    return integration;
  }

  public async createOpenApi(): Promise<OpenApiIntegrationResult> {
    const { restApi } = this.props;

    const compute = await this.compute();

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        compute.responseHandlers,
        compute.name
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

    if (compute.resolveResource.hasUnresolved()) {
      restApi.openapiFactory.addDeferred(async () => {
        integration.requestTemplates = {
          'application/json': await compute.rebuildTemplate(),
        };
      });
    }

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

    const { integrationResponse, resolveResource } =
      await this.callIntegrationMethod<T>();

    const name = `${resourceMetadata.name}-${handler.name}`;

    const role = integrationHelper.createRole({
      name,
      service,
      scope: restApi,
      additionalServices: handler.additionalServices,
    });

    const rebuildTemplate = async () => {
      const rebuilt = await this.callIntegrationMethod<T>();
      if (rebuilt.resolveResource.hasUnresolved()) {
        throw new Error(`unresolved dependencies in ${handler.name} integration`);
      }
      return createTemplate(rebuilt.integrationResponse);
    };

    return {
      name,
      role,
      resolveResource,
      uri: this.getUri(action),
      requestTemplate: resolveResource.hasUnresolved()
        ? ''
        : createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
      rebuildTemplate,
    };
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper, integrationHelper, restApi } =
      this.props;

    const resource: InitializedClass<R> = new classResource();
    const { options, resolveResource } =
      integrationHelper.generateIntegrationOptions(restApi);
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    return {
      integrationResponse,
      resolveResource,
    };
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
