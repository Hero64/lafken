import {
  type KinesisPutRecordIntegrationResponse,
  Method,
} from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
} from '../../integration.types';
import { LafkenIntegration } from '../../integration.utils';

export class PutRecordIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  async create() {
    const {
      classResource,
      handler,
      proxyHelper,
      restApi,
      apiGatewayMethod,
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

    const integration = new LafkenIntegration(restApi, `${name}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: `arn:aws:apigateway:${restApi.region}:kinesis:action/PutRecord`,
      credentials: role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
      },
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': resolveResource.hasUnresolved()
          ? ''
          : this.createTemplate(integrationResponse),
      },
    });

    if (resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        const integrationResponse = await resource[handler.name](
          proxyHelper.createEvent(),
          options
        );
        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride(
          'request_templates.application/json',
          this.createTemplate(integrationResponse)
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
