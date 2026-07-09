import {
  type KinesisPutRecordIntegrationResponse,
  Method,
} from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';

export class PutRecordIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  async create() {
    const { restApi, apiGatewayMethod } = this.props;

    const compute = await this.compute();

    const integration = new LafkenIntegration(restApi, `${compute.name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: `arn:aws:apigateway:${restApi.regionRef}:kinesis:action/PutRecord`,
      credentials: compute.role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
      },
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

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
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
        uri: `arn:aws:apigateway:${restApi.regionRef}:kinesis:action/PutRecord`,
        credentials: compute.role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestParameters: {
          'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
        },
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
      classResource,
      handler,
      proxyHelper,
      restApi,
      resourceMetadata,
      integrationHelper,
      responseHelper,
      responseTemplateHelper,
    } = this.props;

    const { options, resolveResource } =
      integrationHelper.generateIntegrationOptions(restApi);
    const name = `${resourceMetadata.name}-${handler.name}`;

    const resource: InitializedClass<KinesisPutRecordIntegrationResponse> =
      new classResource();
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    const role = integrationHelper.createRole({
      name,
      scope: restApi,
      service: {
        type: 'kinesis',
        permissions: ['PutRecord'],
      },
      additionalServices: handler.additionalServices,
    });

    const rebuildTemplate = async () => {
      const rebuilt = await resource[handler.name](proxyHelper.createEvent(), options);
      if (resolveResource.hasUnresolved()) {
        throw new Error(`unresolved dependencies in ${handler.name} integration`);
      }
      return this.createTemplate(rebuilt);
    };

    return {
      name,
      role,
      resolveResource,
      requestTemplate: resolveResource.hasUnresolved()
        ? ''
        : this.createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
      rebuildTemplate,
    };
  }

  private resolveStreamName(streamName: any): string {
    return this.getFieldAndParseTemplate(streamName, false).template;
  }

  private resolveData(data: unknown): string {
    const { proxyHelper, paramHelper } = this.props;

    const dataResolver = proxyHelper.resolveProxyValue(data, paramHelper.pathParams);

    if (!dataResolver.field) {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      return `$util.base64Encode('${serialized}')`;
    }

    if (dataResolver.field.type === 'Object') {
      const isAllBodyValues = dataResolver.field.properties.every(
        ({ source }) => source === 'body'
      );
      if (isAllBodyValues) {
        return `$util.base64Encode($input.body)`;
      }
      return `$util.base64Encode($input.json('$'))`;
    }

    if (dataResolver.field.source === 'body') {
      return `$util.base64Encode($input.json('$.${dataResolver.path}'))`;
    }

    throw new Error('Kinesis data only supports body source parameters');
  }

  private resolvePartitionKey(partitionKey: any): string {
    return this.getFieldAndParseTemplate(partitionKey, false).template;
  }

  private resolveSequenceNumberForOrdering(sequenceNumber?: string): string {
    if (!sequenceNumber) {
      return '';
    }
    return `, "SequenceNumberForOrdering": "${sequenceNumber}"`;
  }

  private getFieldAndParseTemplate = (fieldValue: any, encode = true) => {
    const { proxyHelper, templateHelper, paramHelper } = this.props;

    const { field, type, path, value } = proxyHelper.resolveProxyValue(
      fieldValue,
      paramHelper.pathParams
    );

    const template = field
      ? templateHelper.generateTemplate({
          field: {
            ...field,
            required: true,
          },
          quoteType: '',
          currentValue: path,
          valueParser: (value, type) =>
            type === 'String' && encode ? `$util.urlEncode(${value})` : value,
        })
      : type === 'String' && encode
        ? `$util.urlEncode('${value}')`
        : value;
    return {
      template,
      type,
    };
  };

  private createTemplate(integrationResponse: KinesisPutRecordIntegrationResponse) {
    const streamName = this.resolveStreamName(integrationResponse.streamName);
    const data = this.resolveData(integrationResponse.data);
    const partitionKey = this.resolvePartitionKey(integrationResponse.partitionKey);
    const sequenceNumber = this.resolveSequenceNumberForOrdering(
      integrationResponse.sequenceNumberForOrdering
    );

    return `{ "StreamName": "${streamName}", "Data": "${data}", "PartitionKey": "${partitionKey}"${sequenceNumber} }`;
  }
}
