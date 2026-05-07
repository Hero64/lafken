import type { BucketIntegrationResponse, Source } from '../../../../../../../main';
import type { InitializedClass, Integration } from '../../integration.types';
import { LafkenIntegration } from '../../integration.utils';
import type { BucketIntegrationBaseProps } from './base.types';

const methodParamMap: Record<Source, string> = {
  query: 'method.request.querystring',
  path: 'method.request.path',
  body: '',
  header: 'method.request.header',
  context: '',
  velocity: '',
};

export class BucketBaseIntegration implements Integration {
  constructor(protected props: BucketIntegrationBaseProps) {}

  async create() {
    const {
      classResource,
      apiGatewayMethod,
      resourceMetadata,
      handler,
      proxyHelper,
      restApi,
      httpMethod,
      paramHelper,
      responseHelper,
      integrationHelper,
      responseTemplateHelper,
      service,
    } = this.props;

    if ((paramHelper.paramsBySource.body || []).length > 0) {
      throw new Error('bucket integration does not support body params');
    }

    const resource: InitializedClass<BucketIntegrationResponse> = new classResource();

    const { options, resolveResource } =
      integrationHelper.generateIntegrationOptions(restApi);
    const integrationResponse: BucketIntegrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    const name = `${resourceMetadata.name}-${handler.name}`;

    const role = integrationHelper.createRole({
      name,
      service,
      scope: restApi,
      additionalServices: handler.additionalServices,
    });

    const integration = new LafkenIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.id,
        type: 'AWS',
        integrationHttpMethod: httpMethod,
        uri: this.getUri(integrationResponse),
        credentials: role.arn,
        requestParameters: this.createRequestParameters(integrationResponse),
        dependsOn: [apiGatewayMethod],
      }
    );
    const responses = [...responseHelper.handlerResponse];

    responses[0].methodParameters = {
      'method.response.header.Content-Type': true,
      'method.response.header.Content-Disposition': true,
    };
    responses[0].integrationParameters = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
    };

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      integrationHelper.generateResponseTemplate(responses, responseTemplateHelper),
      name
    );

    if (resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        const integrationResponse = await resource[handler.name](
          proxyHelper.createEvent(),
          options
        );
        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride('uri', this.getUri(integrationResponse));
      });
    }

    return integration;
  }

  private getPathParam(key: keyof BucketIntegrationResponse, value: any) {
    if (value.isProxy) {
      return `{${key}}`;
    }

    return value;
  }

  private getUri(response: BucketIntegrationResponse) {
    return `arn:aws:apigateway:${this.props.restApi.region}:s3:path/${this.getPathParam('bucket', response.bucket)}/${this.getPathParam('object', response.object)}`;
  }

  private createRequestParameters(integrationResponse: BucketIntegrationResponse) {
    const requestParameters: Record<string, string> = {};
    const bucketIntegration = this.getIntegrationRequestParams(
      integrationResponse.bucket
    );

    const keyIntegration = this.getIntegrationRequestParams(integrationResponse.object);

    if (bucketIntegration) {
      requestParameters['integration.request.path.bucket'] = bucketIntegration;
    }

    if (keyIntegration) {
      requestParameters['integration.request.path.object'] = keyIntegration;
    }

    return requestParameters;
  }

  private getIntegrationRequestParams(value: any) {
    if (value === undefined) {
      return value;
    }

    const { proxyHelper, paramHelper } = this.props;

    const { field, path } = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    if (!field) {
      return undefined;
    }

    return `${methodParamMap[field.source || 'query']}.${path}`;
  }
}
