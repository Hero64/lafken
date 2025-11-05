import type { FieldTypes } from '@alicanto/common';
import { Method } from '../../../../../../../main';
import type { ResponseHandler } from '../../../helpers/response/response.types';
import { getSuccessStatusCode } from '../../../helpers/response/response.utils';
import type { InitializedClass, Integration } from '../../integration.types';
import { AlicantoIntegration } from '../../integration.utils';
import type { DynamoIntegrationBaseProps } from './base.types';

const mapDynamoType: Record<FieldTypes, string> = {
  Array: 'L',
  Boolean: 'BOOL',
  Number: 'N',
  Object: 'M',
  String: 'S',
};

const noStringConvertTypes = new Set<FieldTypes>(['String', 'Boolean']);

export class DynamoBaseIntegration<T> implements Integration {
  constructor(protected props: DynamoIntegrationBaseProps<T>) {}

  public async create() {
    const {
      handler,
      restApi,
      roleArn,
      action,
      resourceMetadata,
      apiGatewayMethod,
      createTemplate,
    } = this.props;

    const { integrationResponse, resolveResource } =
      await this.callIntegrationMethod<T>();

    const integration = new AlicantoIntegration(
      restApi,
      `${resourceMetadata.name}-${handler.name}-integration`,
      {
        httpMethod: apiGatewayMethod.httpMethod,
        resourceId: apiGatewayMethod.resourceId,
        restApiId: restApi.id,
        type: 'AWS',
        integrationHttpMethod: Method.POST,
        uri: this.getUri(action),
        credentials: roleArn,
        passthroughBehavior: 'WHEN_NO_TEMPLATES',
        requestTemplates: {
          'application/json': resolveResource.hasUnresolved()
            ? ''
            : createTemplate(integrationResponse),
        },
        dependsOn: [apiGatewayMethod],
      }
    );

    if (resolveResource.hasUnresolved()) {
      integration.isDependent(async () => {
        const { integrationResponse, resolveResource } =
          await this.callIntegrationMethod<T>();

        if (resolveResource.hasUnresolved()) {
          throw new Error(`unresolved dependencies in ${handler.name} integration`);
        }

        integration.addOverride(
          'requestTemplates.application/json',
          createTemplate(integrationResponse)
        );
      });
    }

    restApi.responseFactory.createResponses(
      apiGatewayMethod,
      integration,
      this.createResponse(),
      `${resourceMetadata.name}-${handler.name}`
    );

    return integration;
  }

  protected async callIntegrationMethod<R>() {
    const { classResource, handler, proxyHelper, integrationHelper } = this.props;

    const resource: InitializedClass<R> = new classResource();
    const { options, resolveResource } = integrationHelper.generateIntegrationOptions();
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
    return `arn:aws:apigateway:${restApi.region}:dynamodb:action/${action}`;
  }

  private createResponse(): ResponseHandler[] {
    const { responseHelper, handler } = this.props;
    const statusCode = getSuccessStatusCode(handler.method);

    return [
      {
        statusCode: statusCode.toString(),
        template: `$input.json('$')`,
      },
      responseHelper.getPatternResponse('400'),
      responseHelper.getPatternResponse('500'),
    ];
  }

  protected marshallField(template: string, type: FieldTypes) {
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
          noStringConvertTypes.has(type) ? template : `"${template}"`,
          type,
          isRoot
        );
      },
      templateOptions: {
        propertyWrapper: (template, param) => this.marshallField(template, param.type),
        valueParser: (value, type) => {
          return noStringConvertTypes.has(type) ? value : `"${value}"`;
        },
      },
    });
  }
}
