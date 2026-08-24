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
      requestTemplates: {
        'application/json': compute.requestTemplate,
      },
      dependsOn: [apiGatewayMethod],
    });

    if (compute.resolveResource.hasUnresolved()) {
      integration.onResolve(async () => {
        integration.addOverride(
          'requestTemplates.application/json',
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

  public async createOpenApi(): Promise<OpenApiIntegrationResult> {
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

    const { integrationResponse, resolveResource } =
      await this.callIntegrationMethod<T>();
    const name = `${resourceMetadata.name}-${handler.name}`;
    const role = integrationHelper.createRole({
      name,
      scope: restApi,
      service,
      additionalServices: handler.additionalServices,
    });

    const rebuildTemplate = async () => {
      const rebuilt = await this.callIntegrationMethod<T>();
      if (rebuilt.resolveResource.hasUnresolved()) {
        throw new Error(`unresolved dependencies in ${handler.name} integration`);
      }
      return createTemplate(rebuilt.integrationResponse);
    };

    return {
      name,
      role,
      resolveResource,
      uri: this.getUri(action),
      requestTemplate: resolveResource.hasUnresolved()
        ? ''
        : createTemplate(integrationResponse),
      responseHandlers: integrationHelper.generateResponseTemplate(
        responseHelper.handlerResponse,
        responseTemplateHelper
      ),
      rebuildTemplate,
    };
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper, integrationHelper } = this.props;

    const resource: InitializedClass<R> = new classResource();
    const { options, resolveResource } = integrationHelper.generateIntegrationOptions(
      this.props.restApi
    );
    const integrationResponse = await resource[handler.name](
      proxyHelper.createEvent(),
      options
    );

    return {
      integrationResponse,
      resolveResource,
    };
  }

  private getUri(action: string) {
    const { restApi } = this.props;
    return `arn:aws:apigateway:${restApi.regionRef}:dynamodb:action/${action}`;
  }

  protected marshallField(template: string, type: FieldTypes) {
    if (type === 'Any') {
      throw new Error('It is not possible to identify the type');
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
