import { ResolveResources } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import type { BucketIntegrationResponse, Method, Source } from '../../../../../../main';
import type { ServiceRoleName } from '../../../helpers/integration/integration.types';
import type { InitializedClass, Integration } from '../../integration.types';
import type { BucketIntegrationBaseProps } from './base.types';

const methodParamMap: Record<Source, string> = {
  query: 'method.request.querystring',
  path: 'method.request.path',
  body: '',
  header: 'method.request.header',
  context: '',
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
    } = this.props;

    if ((paramHelper.paramsBySource.body || []).length > 0) {
      throw new Error('bucket integration does not support body params');
    }

    const resource: InitializedClass<BucketIntegrationResponse> = new classResource();
    const integrationResponse: BucketIntegrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      new ResolveResources()
    );

    new ApiGatewayIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.api.id,
        type: 'AWS',
        integrationHttpMethod: httpMethod,
        uri: this.createUri(integrationResponse),
        credentials: this.getRole().arn,
        requestParameters: this.createRequestParameters(integrationResponse),
      }
    );
    let responses = [...responseHelper.handlerResponse];

    responses[0].methodParameters = {
      'method.response.header.Content-Type': true,
      'method.response.header.Content-Disposition': true,
    };
    responses[0].integrationParameters = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
    };

    if (responses.length === 1) {
      responses = [
        ...responses,
        responseHelper.getPatternResponse('400'),
        responseHelper.getPatternResponse('500'),
      ];
    }

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      responses,
      `${resourceMetadata.name}-${handler.name}`
    );
  }

  private getPathParam(key: keyof BucketIntegrationResponse, value: any) {
    if (value.isProxy) {
      return `{${key}}`;
    }

    return value;
  }

  private createUri(response: BucketIntegrationResponse) {
    return `arn:aws:apigateway:${this.props.restApi.api.region}:s3:path/${this.getPathParam('bucket', response.bucket)}/${this.getPathParam('object', response.object)}`;
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

  private getRole() {
    const { httpMethod, integrationHelper, restApi } = this.props;

    const roleByMethod: Partial<Record<Method, ServiceRoleName>> = {
      GET: 's3.read',
      PUT: 's3.write',
      DELETE: 's3.delete',
    };

    if (!roleByMethod[httpMethod]) {
      throw new Error(`Method ${httpMethod} is not allowed in bucket integration`);
    }

    return integrationHelper.createRole(roleByMethod[httpMethod], restApi);
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
