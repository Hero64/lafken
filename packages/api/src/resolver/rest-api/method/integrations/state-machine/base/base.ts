import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { Method } from '../../../../../../main';
import type { ResponseHandler } from '../../../helpers/response/response.types';
import { getSuccessStatusCode } from '../../../helpers/response/response.utils';
import type { InitializedClass, Integration } from '../../integration.types';
import type { StateMachineIntegrationBaseProps } from './base.types';

export class StateMachineBaseIntegration<T> implements Integration {
  constructor(protected props: StateMachineIntegrationBaseProps<T>) {}

  public async create() {
    const {
      handler,
      restApi,
      roleArn,
      action,
      resourceMetadata,
      apiGatewayMethod,
      createTemplate,
    } = this.props;

    const { integrationResponse, resolveResource } =
      await this.callIntegrationMethod<T>();

    const integration = alicantoResource.create(
      'integration',
      ApiGatewayIntegration,
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.api.id,
        type: 'AWS',
        integrationHttpMethod: Method.POST,
        uri: this.getUri(action),
        credentials: roleArn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestTemplates: {
          'application/json': resolveResource.hasUnresolved()
            ? ''
            : createTemplate(integrationResponse),
        },
      }
    );

    if (resolveResource.hasUnresolved()) {
      integration.isDependent(async () => {
        const { integrationResponse, resolveResource } =
          await this.callIntegrationMethod<T>();

        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride(
          'requestTemplates.application/json',
          createTemplate(integrationResponse)
        );
      });
    }

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      this.createResponse(),
      `${resourceMetadata.name}-${handler.name}`
    );
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
    return `arn:aws:apigateway:${restApi.api.region}:states:action/${action}`;
  }

  private createResponse(): ResponseHandler[] {
    const { responseHelper, handler, successResponse } = this.props;
    const statusCode = getSuccessStatusCode(handler.method);

    return [
      {
        ...successResponse,
        statusCode: statusCode.toString(),
      },
      responseHelper.getPatternResponse('400'),
      responseHelper.getPatternResponse('500'),
    ];
  }

  protected getResponseValue(value: any, quoteType = '"') {
    const { proxyHelper, paramHelper, templateHelper } = this.props;
    const responseValue = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    return templateHelper.getTemplateFromProxyValue(responseValue, quoteType);
  }
}
