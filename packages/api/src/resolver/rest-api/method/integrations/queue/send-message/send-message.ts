import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import {
  type ApiParamMetadata,
  Method,
  type QueueSendMessageIntegrationResponse,
} from '../../../../../../main';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
} from '../../integration.types';

export class SendMessageIntegration implements Integration {
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
    } = this.props;

    const { options, resolveResource } = integrationHelper.generateIntegrationOptions();
    const resource: InitializedClass<QueueSendMessageIntegrationResponse> =
      new classResource();
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

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
        uri: resolveResource.hasUnresolved() ? '' : this.getUri(integrationResponse),
        credentials: integrationHelper.createRole('sqs.write', restApi).arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestTemplates: {
          'application/json': resolveResource.hasUnresolved()
            ? ''
            : this.createTemplate(integrationResponse),
        },
      }
    );

    if (resolveResource.hasUnresolved()) {
      integration.isDependent(async () => {
        const integrationResponse = await resource[handler.name](
          proxyHelper.createEvent(),
          resolveResource
        );
        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride('uri', this.getUri(integrationResponse));
        integration.addOverride(
          'requestTemplates.application/json',
          this.createTemplate(integrationResponse)
        );
      });
    }
  }

  private getUri(integrationResponse: QueueSendMessageIntegrationResponse) {
    const { restApi } = this.props;

    const queueName = this.getFieldAndParseTemplate(
      integrationResponse.queueName
    ).template;

    return `arn:aws:apigateway:${restApi.api.region}:sqs:path/${queueName}`;
  }

  private resolveBody = (value: any) => {
    if (value === undefined) {
      return '';
    }
    const { proxyHelper, paramHelper } = this.props;

    const bodyResolver = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    if (!bodyResolver.field) {
      throw new Error('Body message only support event parameters');
    }

    if (bodyResolver.path === '' && bodyResolver.field.type === 'Object') {
      const isAllBodyValues = bodyResolver.field.properties.every(
        ({ source }) => source === 'body'
      );

      if (!isAllBodyValues) {
        throw new Error('Body message only support body source parameters');
      }

      return "&MessageBody=$util.urlEncode($input.json('$'))";
    }

    if (bodyResolver.field.source !== 'body') {
      throw new Error('Body message only support single body event parameter');
    }

    return `&MessageBody=$util.urlEncode($input.json('$.${bodyResolver.path}'))`;
  };

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
            validation: {
              ...field.validation,
              required: true,
            },
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

  private resolveAttributes = (attributeValue: any) => {
    if (attributeValue === undefined) {
      return '';
    }

    const { proxyHelper, paramHelper } = this.props;

    const attributesResolver = proxyHelper.resolveProxyValue(
      attributeValue,
      paramHelper.pathParams
    );
    let attributeFields: Pick<ApiParamMetadata, 'name' | 'destinationName'>[] = [];

    if (attributesResolver.field && attributesResolver.field.type === 'Object') {
      attributeFields =
        attributesResolver.field.properties.map(({ name, destinationName }) => ({
          name,
          destinationName,
        })) || [];
    } else {
      attributeFields = Object.keys(attributeValue).map((name) => ({
        name: String(name),
        destinationName: String(name),
      }));
    }

    const queueAttributes: string[] = [];
    for (let i = 0; i < attributeFields.length; i++) {
      const name = `&MessageAttribute.${i + 1}`;
      let attribute = '';
      const attributeField = attributeFields[i];

      const { template, type } = this.getFieldAndParseTemplate(
        attributeValue[attributeField.name]
      );

      attribute += `${name}.Name=${attributeField.destinationName}`;
      attribute += `${name}.Value.StringValue=${template}`;
      attribute += `${name}.Value.DataType=${type}`;

      queueAttributes.push(attribute);
    }

    return queueAttributes.join('');
  };

  private createTemplate(integrationResponse: QueueSendMessageIntegrationResponse) {
    const bodyTemplate = this.resolveBody(integrationResponse.body);
    const attributeTemplate = this.resolveAttributes(integrationResponse.attributes);

    return `Action=SendMessage${bodyTemplate}${attributeTemplate}`;
  }
}
