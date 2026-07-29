import type { BucketIntegrationResponse, Source } from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';
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
    const { apiGatewayMethod, restApi, httpMethod } = this.props;

    const compute = await this.compute();

    const integration = new LafkenIntegration(restApi, `${compute.name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: httpMethod,
      uri: compute.uri,
      credentials: compute.role.arn,
      requestParameters: compute.requestParameters,
      dependsOn: [apiGatewayMethod],
    });

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      compute.responseHandlers,
      compute.name
    );

    if (compute.resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        const uri = await compute.rebuildUri();
        integration.addOverride('uri', uri);
      });
    }

    return integration;
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    const { restApi, httpMethod } = this.props;

    const compute = await this.compute();

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        compute.responseHandlers,
        compute.name
      );

    const integration = toXAmazonIntegration(
      {
        type: 'AWS',
        integrationHttpMethod: httpMethod,
        uri: compute.uri,
        credentials: compute.role.arn,
        requestParameters: compute.requestParameters,
      },
      integrationResponses
    );

    if (compute.resolveResource.hasUnresolved()) {
      restApi.openapiFactory.addDeferred(async () => {
        integration.uri = await compute.rebuildUri();
      });
    }

    return { integration, responses: operationResponses };
  }

  private async compute() {
    const {
      classResource,
      resourceMetadata,
      handler,
      proxyHelper,
      restApi,
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

    const requestParameters: Record<string, string> = {};
    const uri = this.getUri(integrationResponse, requestParameters);

    const role = integrationHelper.createRole({
      name,
      service,
      scope: restApi,
      additionalServices: handler.additionalServices,
    });

    const responses = [...responseHelper.handlerResponse];
    responses[0].methodParameters = {
      'method.response.header.Content-Type': true,
      'method.response.header.Content-Disposition': true,
    };
    responses[0].integrationParameters = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
    };

    const rebuildUri = async () => {
      const rebuilt: BucketIntegrationResponse = await resource[handler.name](
        proxyHelper.createEvent(),
        options
      );
      if (resolveResource.hasUnresolved()) {
        throw new Error(`unresolved dependencies in ${handler.name} integration`);
      }
      return this.getUri(rebuilt);
    };

    return {
      name,
      role,
      resolveResource,
      uri,
      requestParameters,
      responseHandlers: integrationHelper.generateResponseTemplate(
        responses,
        responseTemplateHelper
      ),
      rebuildUri,
    };
  }

  private getUri(
    response: BucketIntegrationResponse,
    requestParameters: Record<string, string> = {}
  ) {
    const bucket = this.buildPath('bucket', response.bucket, requestParameters);
    const object = this.buildPath('object', response.object, requestParameters);

    return `arn:aws:apigateway:${this.props.restApi.regionRef}:s3:path/${bucket}/${object}`;
  }

  /**
   * Build a URI path portion for a field, supporting values that mix static text
   * with event proxies (e.g. `` `data/temp/${e.file}` ``). Each proxy segment is
   * emitted as an API Gateway path override placeholder and mapped to its request
   * source in `requestParameters`.
   */
  private buildPath(
    field: 'bucket' | 'object',
    value: any,
    requestParameters: Record<string, string>
  ) {
    if (value === undefined) {
      return '';
    }

    const { proxyHelper, paramHelper } = this.props;

    let proxyIndex = 0;

    return proxyHelper
      .segments(value)
      .map((segment) => {
        if (!segment.isProxy) {
          return segment.value;
        }

        const paramName = proxyIndex === 0 ? field : `${field}${proxyIndex}`;
        proxyIndex += 1;

        const eventField = paramHelper.pathParams[segment.value];
        if (!eventField) {
          throw new Error(`The value for the path ${segment.value} does not exist.`);
        }

        requestParameters[`integration.request.path.${paramName}`] =
          `${methodParamMap[eventField.source || 'query']}.${segment.value}`;

        return `{${paramName}}`;
      })
      .join('');
  }
}
