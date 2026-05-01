import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import { Role } from '@lafken/resolver';
import {
  type ApiParamMetadata,
  Method,
  type QueueSendMessageIntegrationResponse,
  type ResponseArrayField,
  type ResponseObjectMetadata,
} from '../../../../../../../main';
import { ResponseTemplateHelper } from '../../../helpers/response-template/response-template';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
} from '../../integration.types';
import { LafkenIntegration } from '../../integration.utils';

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
      responseHelper,
    } = this.props;

    const { options, resolveResource } = integrationHelper.generateIntegrationOptions();

    const resource: InitializedClass<QueueSendMessageIntegrationResponse> =
      new classResource();
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    const role = new Role(restApi, `${resourceMetadata.name}-${handler.name}-role`, {
      name: `${resourceMetadata.name}-${handler.name}-integration`,
      principal: 'apigateway.amazonaws.com',
      services: (props) => {
        const base = { type: 'sqs' as const, permissions: ['SendMessage' as const] };
        if (handler.additionalServices === undefined) return [base];
        if (Array.isArray(handler.additionalServices))
          return [base, ...handler.additionalServices];
        return [base, ...handler.additionalServices(props)];
      },
    });

    const integration = new LafkenIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.id,
        type: 'AWS',
        integrationHttpMethod: Method.POST,
        uri: resolveResource.hasUnresolved() ? '' : this.getUri(integrationResponse),
        credentials: role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestParameters: {
          'integration.request.header.Content-Type':
            "'application/x-www-form-urlencoded'",
        },
        dependsOn: [apiGatewayMethod],
        requestTemplates: {
          'application/json': resolveResource.hasUnresolved()
            ? ''
            : this.createTemplate(integrationResponse),
        },
      }
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
        integration.addOverride(
          'request_templates.application/json',
          this.createTemplate(integrationResponse)
        );
      });
    }

    const responseTemplateHelper = new ResponseTemplateHelper();
    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      responseHelper.handlerResponse.map((response) => {
        return {
          ...response,
          template:
            !response.template &&
            (response.field?.type === 'Object' || response.field?.type === 'Array')
              ? responseTemplateHelper.buildTemplate(
                  response.field as ResponseObjectMetadata | ResponseArrayField
                )
              : response.template,
        };
      }),

      `${resourceMetadata.name}-${handler.name}`
    );

    return integration;
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

    return `arn:aws:apigateway:${restApi.region}:sqs:path/${accountId}/${queueName}`;
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

  private createTemplate(integrationResponse: QueueSendMessageIntegrationResponse) {
    const bodyTemplate = this.resolveBody(integrationResponse.body);
    const attributeTemplate = this.resolveAttributes(integrationResponse.attributes);

    return `Action=SendMessage${bodyTemplate}${attributeTemplate}`;
  }
}
