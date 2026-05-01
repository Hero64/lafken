import { Method } from '../../../../../../../main';
import type { InitializedClass, Integration } from '../../integration.types';
import { LafkenIntegration } from '../../integration.utils';
import type { StateMachineIntegrationBaseProps } from './base.types';

export class StateMachineBaseIntegration<T> implements Integration {
  constructor(protected props: StateMachineIntegrationBaseProps<T>) {}

  public async create() {
    const {
      handler,
      restApi,
      action,
      service,
      resourceMetadata,
      responseHelper,
      responseTemplateHelper,
      apiGatewayMethod,
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

    const integration = new LafkenIntegration(restApi, `${name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: this.getUri(action),
      credentials: role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': resolveResource.hasUnresolved()
          ? ''
          : createTemplate(integrationResponse),
      },
    });

    if (resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        const { integrationResponse, resolveResource } =
          await this.callIntegrationMethod<T>();

        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride(
          'request_templates.application/json',
          createTemplate(integrationResponse)
        );
      });
    }

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
      name
    );

    return integration;
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper, integrationHelper } = this.props;

    const resource: InitializedClass<R> = new classResource();
    const { options, resolveResource } = integrationHelper.generateIntegrationOptions();
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
    return `arn:aws:apigateway:${restApi.region}:states:action/${action}`;
  }

  protected getResponseValue(value: any, quoteType = '"') {
    const { proxyHelper, paramHelper, templateHelper } = this.props;
    const responseValue = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    return templateHelper.getTemplateFromProxyValue(responseValue, quoteType);
  }
}
