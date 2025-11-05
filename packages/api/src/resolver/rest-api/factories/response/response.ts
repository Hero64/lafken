import type { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import type { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import type { TerraformResource } from 'cdktf';
import type { RestApi } from '../../rest-api';
import type { ResponseHandler } from '../method/helpers/response/response.types';

export class ResponseFactory {
  private responses: TerraformResource[] = [];
  constructor(private scope: RestApi) {}

  get resources() {
    return this.responses;
  }

  public createResponses(
    method: ApiGatewayMethod,
    integration: ApiGatewayIntegration,
    responses: ResponseHandler[],
    baseName: string
  ) {
    for (const response of responses) {
      const responseName = `${baseName}-${response.statusCode}`;

      const methodResponse = new ApiGatewayMethodResponse(
        this.scope,
        `${responseName}-method-response`,
        {
          httpMethod: method.httpMethod,
          resourceId: method.resourceId,
          restApiId: this.scope.id,
          statusCode: response.statusCode,
          responseParameters: response.methodParameters,
          dependsOn: [method],
          responseModels: response.field
            ? {
                'application/json': this.scope.modelFactory.getModel({
                  field: response.field,
                  defaultModelName: `${responseName}Model`,
                  dependsOn: [method],
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
          responseParameters: response.integrationParameters,
          selectionPattern: response.selectionPattern,
          responseTemplates: response.template
            ? {
                'application/json': response.template,
              }
            : undefined,
          dependsOn: [integration],
        }
      );

      this.responses.push(methodResponse, integrationResponse);
    }
  }
}
