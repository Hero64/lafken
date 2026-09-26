import type { FieldTypes } from '@lafken/common';
import { Method } from '../../../../../../../main';
import type {
  InitializedClass,
  Integration,
  OpenApiIntegrationResult,
} from '../../integration.types';
import { LafkenIntegration, toXAmazonIntegration } from '../../integration.utils';
import type { DynamoIntegrationBaseProps } from './base.types';

const mapDynamoType: Record<FieldTypes, string> = {
  Array: 'L',
  Boolean: 'BOOL',
  Number: 'N',
  Object: 'M',
  String: 'S',
  Any: 'ANY',
};

export class DynamoBaseIntegration<T> implements Integration {
  constructor(protected props: DynamoIntegrationBaseProps<T>) {}

  public async create() {
    const { restApi, apiGatewayMethod, routeId } = this.props;

    const compute = await this.compute();

    const integration = new LafkenIntegration(restApi, `${routeId}-integration`, {
      httpMethod: apiGatewayMethod.httpMethod,
      resourceId: apiGatewayMethod.resourceId,
      restApiId: restApi.id,
      type: 'AWS',
      integrationHttpMethod: Method.POST,
      uri: compute.uri,
      credentials: compute.role.arn,
      passthroughBehavior: 'WHEN_NO_TEMPLATES',
      requestTemplates: {
        'application/json': compute.requestTemplate,
      },
      dependsOn: [apiGatewayMethod],
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

  public async createOpenApi(): Promise<OpenApiIntegrationResult> {
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
        uri: compute.uri,
        credentials: compute.role.arn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
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
      handler,
      restApi,
      service,
      action,
      resourceMetadata,
      integrationHelper,
      responseHelper,
      responseTemplateHelper,
      createTemplate,
    } = this.props;

    const integrationResponse = await this.callIntegrationMethod<T>();
    const name = `${resourceMetadata.name}-${handler.name}`;
    const role = integrationHelper.createRole({
      name,
      scope: restApi,
      service,
      additionalServices: handler.additionalServices,
    });

    return {
      name,
      role,
      uri: this.getUri(action),
      requestTemplate: createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
    };
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper } = this.props;

    const resource: InitializedClass<R> = new classResource();

    return resource[handler.name](proxyHelper.createEvent());
  }

  private getUri(action: string) {
    const { restApi } = this.props;
    return `arn:aws:apigateway:${restApi.regionRef}:dynamodb:action/${action}`;
  }

  protected marshallField(template: string, type: FieldTypes) {
    if (type === 'Any') {
      throw new Error(
        `Cannot infer the DynamoDB attribute type for "${template}". Declare the field with a concrete type instead of 'Any'.`
      );
    }
    return `{ "${mapDynamoType[type]}": ${template} }`;
  }

  protected marshallByType = (
    template: string,
    fieldType: FieldTypes,
    isRoot: boolean
  ) => {
    if (isRoot) {
      return template;
    }

    return this.marshallField(template, fieldType);
  };

  protected resolveItemTemplate(value: any) {
    const { templateHelper, proxyHelper, paramHelper } = this.props;
    return templateHelper.generateTemplateByObject({
      value,
      resolveValue: (value) => {
        return proxyHelper.resolveProxyValue(value, paramHelper.pathParams);
      },
      parseObjectValue: (template, type, isRoot) => {
        return this.marshallByType(
          type !== 'Number' ? template : `"${template}"`,
          type,
          isRoot
        );
      },
      templateOptions: {
        propertyWrapper: (template, param) => this.marshallField(template, param.type),
        valueParser: (value, type) => {
          return type !== 'Number' ? value : `"${value}"`;
        },
      },
    });
  }
}
