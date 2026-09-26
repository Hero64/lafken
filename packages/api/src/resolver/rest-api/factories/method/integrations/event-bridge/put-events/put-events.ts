import {
  type EventBridgePutEventsIntegrationResponse,
  Method,
} from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  IntegrationProps,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';

export class PutEventsIntegration implements Integration {
  constructor(protected props: IntegrationProps) {}

  async create() {
    const { restApi, apiGatewayMethod, routeId } = this.props;

    const compute = await this.compute();

    const integration = new LafkenIntegration(restApi, `${routeId}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: `arn:aws:apigateway:${restApi.regionRef}:events:action/PutEvents`,
      credentials: compute.role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
        'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'",
      },
      dependsOn: [apiGatewayMethod],
      requestTemplates: {
        'application/json': compute.requestTemplate,
      },
    });

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      compute.responseHandlers,
      compute.name,
      this.props.cors
    );

    return integration;
  }

  async createOpenApi(): Promise<OpenApiIntegrationResult> {
    const { restApi } = this.props;

    const compute = await this.compute();

    const { operationResponses, integrationResponses } =
      restApi.responseFactory.buildResponseFragments(
        compute.responseHandlers,
        compute.name,
        this.props.cors
      );

    const integration = toXAmazonIntegration(
      {
        type: 'AWS',
        integrationHttpMethod: Method.POST,
        uri: `arn:aws:apigateway:${restApi.regionRef}:events:action/PutEvents`,
        credentials: compute.role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestParameters: {
          'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
          'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'",
        },
        requestTemplates: {
          'application/json': compute.requestTemplate,
        },
      },
      integrationResponses
    );

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

    const name = `${resourceMetadata.name}-${handler.name}`;

    const resource: InitializedClass<EventBridgePutEventsIntegrationResponse> =
      new classResource();
    const integrationResponse = await resource[handler.name](proxyHelper.createEvent());

    const role = integrationHelper.createRole({
      name,
      scope: restApi,
      service: {
        type: 'event',
        permissions: ['PutEvents'],
      },
      additionalServices: handler.additionalServices,
    });

    return {
      name,
      role,
      requestTemplate: this.createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
    };
  }

  private resolveString(value: any): string {
    const { proxyHelper, paramHelper, templateHelper } = this.props;
    const resolver = proxyHelper.resolveProxyValue(value, paramHelper.pathParams);
    return templateHelper.getTemplateFromProxyValue(resolver);
  }

  /**
   * Serializes the event payload into the JSON string expected by the
   * `Detail` field. Object literals can mix static values and `@Event` fields;
   * string leaves are escaped with `$util.escapeJavaScript` so the resulting
   * string is valid JSON.
   */
  private resolveDetail(detail: any): string {
    if (detail === undefined) {
      return '{}';
    }
    const { proxyHelper, paramHelper, templateHelper } = this.props;

    return templateHelper.generateTemplateByObject({
      value: detail,
      quoteType: '\\"',
      resolveValue: (value) =>
        proxyHelper.resolveProxyValue(value, paramHelper.pathParams),
      parseObjectValue: (value, fieldType, _isRoot, isField) => {
        return isField || fieldType !== 'String'
          ? value
          : `\\"${templateHelper.scapeJavascriptValue(
              value.replaceAll('\\"', "'"),
              fieldType
            )}\\"`;
      },
      templateOptions: {
        valueParser: (value, fieldType) => {
          const template = fieldType === 'String' ? value.replaceAll('\\"', '') : value;
          return `\\"${templateHelper.scapeJavascriptValue(template, fieldType)}\\"`;
        },
      },
    });
  }

  private createTemplate(integrationResponse: EventBridgePutEventsIntegrationResponse) {
    const source = this.resolveString(integrationResponse.source);
    const detailType = this.resolveString(integrationResponse.detailType);
    const detail = this.resolveDetail(integrationResponse.detail);
    const eventBusName = integrationResponse.eventBusName
      ? `, "EventBusName": ${this.resolveString(integrationResponse.eventBusName)}`
      : '';

    return `{ "Entries": [{ "Source": ${source}, "DetailType": ${detailType}, "Detail": "${detail}"${eventBusName} }] }`;
  }
}
