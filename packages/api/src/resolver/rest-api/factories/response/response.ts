import type { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import type { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import type { TerraformResource } from 'cdktn';
import type { CorsOptions, RestApi } from '../../../resolver.types';
import { CorsHelper } from '../method/helpers/cors/cors';
import type { ResponseHandler } from '../method/helpers/response/response.types';
import type {
  ResponseObject,
  XAmazonIntegrationResponse,
} from '../openapi/openapi.types';

const METHOD_RESPONSE_HEADER_PREFIX = 'method.response.header.';

export class ResponseFactory {
  private responses: TerraformResource[] = [];
  private corsHelper = new CorsHelper();
  constructor(private scope: RestApi) {}

  get resources() {
    return this.responses;
  }

  /**
   * Openapi-mode counterpart of {@link createResponses}: builds the operation
   * `responses` map and the `x-amazon-apigateway-integration.responses` map
   * from the same {@link ResponseHandler} data, without creating any resource.
   */
  public buildResponseFragments(
    responses: ResponseHandler[],
    baseName: string,
    cors?: CorsOptions
  ) {
    const operationResponses: Record<string, ResponseObject> = {};
    const integrationResponses: Record<string, XAmazonIntegrationResponse> = {};

    for (const response of responses) {
      const responseName = `${baseName}-${response.statusCode}`;
      const { methodParameters, integrationParameters } = this.mergeCorsParameters(
        response,
        cors
      );

      const headers = this.buildResponseHeaders(methodParameters);
      const content = this.buildResponseContent(response, responseName);

      operationResponses[response.statusCode] = {
        description: response.statusCode,
        headers,
        content,
      };

      const key = response.selectionPattern ?? 'default';
      integrationResponses[key] = {
        statusCode: response.statusCode,
        responseTemplates: response.template
          ? { 'application/json': response.template }
          : undefined,
        responseParameters:
          Object.keys(integrationParameters).length > 0
            ? integrationParameters
            : undefined,
      };
    }

    return { operationResponses, integrationResponses };
  }

  private mergeCorsParameters(response: ResponseHandler, cors?: CorsOptions) {
    const corsHeaders = this.corsHelper.isEnabled(cors)
      ? this.corsHelper.buildActualResponseHeaders(cors, response.statusCode)
      : {};

    return {
      methodParameters: {
        ...response.methodParameters,
        ...this.corsHelper.buildMethodResponseParameters(corsHeaders),
      },
      integrationParameters: { ...response.integrationParameters, ...corsHeaders },
    };
  }

  private buildResponseHeaders(methodParameters?: Record<string, boolean>) {
    if (!methodParameters) {
      return undefined;
    }

    const headers: Record<string, { schema: { type: 'string' } }> = {};
    for (const key of Object.keys(methodParameters)) {
      const name = key.replace(METHOD_RESPONSE_HEADER_PREFIX, '');
      headers[name] = { schema: { type: 'string' } };
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  private buildResponseContent(response: ResponseHandler, responseName: string) {
    if (
      !response.field ||
      (response.field.type === 'Object' && response.field.properties === undefined)
    ) {
      return undefined;
    }

    const { ref } = this.scope.modelFactory.getModel({
      field: response.field,
      defaultModelName: `${responseName}Model`,
    });

    return {
      'application/json': { schema: { $ref: ref } },
    };
  }

  public createResponses(
    method: ApiGatewayMethod,
    integration: ApiGatewayIntegration,
    responses: ResponseHandler[],
    baseName: string,
    cors?: CorsOptions
  ) {
    for (const response of responses) {
      const responseName = `${baseName}-${response.statusCode}`;
      const { methodParameters, integrationParameters } = this.mergeCorsParameters(
        response,
        cors
      );

      const methodResponse = new ApiGatewayMethodResponse(
        this.scope,
        `${responseName}-method-response`,
        {
          httpMethod: method.httpMethod,
          resourceId: method.resourceId,
          restApiId: this.scope.id,
          statusCode: response.statusCode,
          responseParameters:
            Object.keys(methodParameters).length > 0 ? methodParameters : undefined,
          dependsOn: [method, integration],
          responseModels:
            response.field &&
            (response.field.type !== 'Object' || response.field.properties !== undefined)
              ? {
                  'application/json': this.scope.modelFactory.getModel({
                    field: response.field,
                    defaultModelName: `${responseName}Model`,
                    dependsOn: [method, integration],
                  }).name,
                }
              : undefined,
        }
      );

      const integrationResponse = new ApiGatewayIntegrationResponse(
        this.scope,
        `${responseName}-integration-response`,
        {
          httpMethod: integration.httpMethod,
          resourceId: integration.resourceId,
          restApiId: this.scope.id,
          statusCode: response.statusCode,
          responseParameters:
            Object.keys(integrationParameters).length > 0
              ? integrationParameters
              : undefined,
          selectionPattern: response.selectionPattern,
          responseTemplates: response.template
            ? { 'application/json': response.template }
            : undefined,
          dependsOn: [integration, methodResponse],
        }
      );
      this.responses.push(methodResponse, integrationResponse);
    }
  }
}
