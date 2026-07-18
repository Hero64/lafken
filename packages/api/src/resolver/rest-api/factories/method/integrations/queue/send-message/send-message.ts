import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import {
  type ApiParamMetadata,
  Method,
  type QueueSendMessageIntegrationResponse,
} from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';

export class SendMessageIntegration implements Integration {
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
      uri: compute.uri,
      credentials: compute.role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
      },
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': compute.requestTemplate,
      },
    });

    if (compute.resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        const rebuilt = await compute.rebuild();
        integration.addOverride('uri', rebuilt.uri);
        integration.addOverride('request_templates.application/json', rebuilt.template);
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
        uri: compute.uri,
        credentials: compute.role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestParameters: {
          'integration.request.header.Content-Type':
            "'application/x-www-form-urlencoded'",
        },
        requestTemplates: {
          'application/json': compute.requestTemplate,
        },
      },
      integrationResponses
    );

    if (compute.resolveResource.hasUnresolved()) {
      restApi.openapiFactory.addDeferred(async () => {
        const rebuilt = await compute.rebuild();
        integration.uri = rebuilt.uri;
        integration.requestTemplates = { 'application/json': rebuilt.template };
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

    const resource: InitializedClass<QueueSendMessageIntegrationResponse> =
      new classResource();
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    const role = integrationHelper.createRole({
      name,
      scope: restApi,
      service: {
        type: 'sqs',
        permissions: ['SendMessage'],
      },
      additionalServices: handler.additionalServices,
    });

    const rebuild = async () => {
      const rebuilt = await resource[handler.name](proxyHelper.createEvent(), options);
      if (resolveResource.hasUnresolved()) {
        throw new Error(`unresolved dependencies in ${handler.name} integration`);
      }
      return {
        uri: this.getUri(rebuilt),
        template: this.createTemplate(rebuilt),
      };
    };

    return {
      name,
      role,
      resolveResource,
      uri: resolveResource.hasUnresolved() ? '' : this.getUri(integrationResponse),
      requestTemplate: resolveResource.hasUnresolved()
        ? ''
        : this.createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
      rebuild,
    };
  }

  private getUri(integrationResponse: QueueSendMessageIntegrationResponse) {
    const { restApi, scope, resourceMetadata, handler } = this.props;

    const queueName = this.getFieldAndParseTemplate(
      integrationResponse.queueName,
      false
    ).template;

    const identity = new DataAwsCallerIdentity(
      scope,
      `${resourceMetadata.name}-${handler.name}-identity`
    );
    const accountId = identity.accountId;

    return `arn:aws:apigateway:${restApi.regionRef}:sqs:path/${accountId}/${queueName}`;
  }

  private resolveBody = (value: any) => {
    if (value === undefined) {
      return '';
    }
    const { proxyHelper, paramHelper } = this.props;

    const bodyResolver = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);

    if (!bodyResolver.field) {
      if (typeof value === 'string') {
        return `&MessageBody=$util.urlEncode("${value}")`;
      }
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

    return `&MessageBody={"${bodyResolver.path}":$util.urlEncode($input.json('$.${bodyResolver.path}'))}`;
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

  private resolveGroupId(groupId?: string) {
    if (!groupId) {
      return '';
    }

    return `&MessageGroupId=${groupId}`;
  }

  private resolveDeduplicationId(deduplicationId?: string) {
    if (!deduplicationId) {
      return '';
    }

    return `&MessageDeduplicationId=${deduplicationId}`;
  }

  private createTemplate(integrationResponse: QueueSendMessageIntegrationResponse) {
    const bodyTemplate = this.resolveBody(integrationResponse.body);
    const attributeTemplate = this.resolveAttributes(integrationResponse.attributes);
    const groupIdTemplate = this.resolveGroupId(integrationResponse.groupId);
    const deduplicationIdTemplate = this.resolveDeduplicationId(
      integrationResponse.deduplicationId
    );

    return `Action=SendMessage${bodyTemplate}${attributeTemplate}${groupIdTemplate}${deduplicationIdTemplate}`;
  }
}
