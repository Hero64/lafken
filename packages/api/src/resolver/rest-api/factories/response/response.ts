import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import type { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import type { ResponseHandler } from '../../method/helpers/response/response.types';
import type { RestApi } from '../../rest-api';

export class ResponseFactory {
  constructor(private scope: RestApi) {}

  public createResponses(
    method: ApiGatewayMethod,
    responses: ResponseHandler[],
    baseName: string
  ) {
    for (const response of responses) {
      const responseName = `${baseName}-${response.statusCode}`;

      new ApiGatewayMethodResponse(this.scope, `${responseName}-method-response`, {
        httpMethod: method.httpMethod,
        resourceId: method.resourceId,
        restApiId: this.scope.api.id,
        statusCode: response.statusCode,
        responseModels: response.field
          ? {
              'application/json': this.scope.modelFactory.getModel(
                response.field,
                `${responseName}-model`
              ).id,
            }
          : undefined,
      });

      new ApiGatewayIntegrationResponse(
        this.scope,
        `${responseName}-integration-response`,
        {
          httpMethod: method.httpMethod,
          resourceId: method.resourceId,
          restApiId: this.scope.api.id,
          statusCode: response.statusCode,
          selectionPattern: response.selectionPattern,
          responseTemplates: response.template
            ? {
                'application/json': response.template,
              }
            : undefined,
        }
      );
    }
  }
}
