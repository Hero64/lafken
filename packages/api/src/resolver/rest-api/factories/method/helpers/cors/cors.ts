import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import type { TerraformResource } from 'cdktn';
import type { CorsOptions, RestApi } from '../../../../../resolver.types';

export class CorsHelper {
  public createOptionsMethod(
    scope: RestApi,
    methodName: string,
    resourceId: string,
    cors: NonNullable<CorsOptions>
  ): TerraformResource[] {
    const corsHeaders = this.buildHeaders(cors);

    const corsMethod = new ApiGatewayMethod(scope, `${methodName}-options-method`, {
      resourceId,
      restApiId: scope.id,
      httpMethod: 'OPTIONS',
      authorization: 'NONE',
      dependsOn: [scope],
    });

    const corsIntegration = new ApiGatewayIntegration(
      scope,
      `${methodName}-options-integration`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: scope.id,
        type: 'MOCK',
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
        dependsOn: [corsMethod],
      }
    );

    const corsResponse = new ApiGatewayMethodResponse(
      scope,
      `${methodName}-options-method-response`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: scope.id,
        statusCode: '200',
        responseParameters: this.buildMethodResponseParameters(corsHeaders),
        dependsOn: [corsMethod],
      }
    );

    const corsIntegrationResponse = new ApiGatewayIntegrationResponse(
      scope,
      `${methodName}-options-integration-response`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: scope.id,
        statusCode: '200',
        responseParameters: corsHeaders,
        responseTemplates: {
          'application/json': '',
        },
        dependsOn: [corsMethod],
      }
    );

    return [corsMethod, corsIntegration, corsResponse, corsIntegrationResponse];
  }

  public buildHeaders(cors: NonNullable<CorsOptions>): Record<string, string> {
    const headers: Record<string, string> = {};

    if (cors.allowOrigins !== undefined) {
      if (typeof cors.allowOrigins === 'boolean') {
        headers['method.response.header.Access-Control-Allow-Origin'] = cors.allowOrigins
          ? "'*'"
          : "'null'";
      } else if (typeof cors.allowOrigins === 'string') {
        headers['method.response.header.Access-Control-Allow-Origin'] =
          `'${cors.allowOrigins}'`;
      } else if (Array.isArray(cors.allowOrigins)) {
        headers['method.response.header.Access-Control-Allow-Origin'] =
          `'${cors.allowOrigins[0] || '*'}'`;
      } else if (cors.allowOrigins instanceof RegExp) {
        headers['method.response.header.Access-Control-Allow-Origin'] = "'*'";
      }
    } else {
      headers['method.response.header.Access-Control-Allow-Origin'] = "'*'";
    }

    const allowedMethods = cors.allowMethods || [
      'GET',
      'HEAD',
      'PUT',
      'PATCH',
      'POST',
      'DELETE',
    ];
    headers['method.response.header.Access-Control-Allow-Methods'] =
      `'${allowedMethods.join(',')}'`;

    if (cors.allowHeaders !== undefined) {
      if (typeof cors.allowHeaders === 'boolean') {
        headers['method.response.header.Access-Control-Allow-Headers'] = cors.allowHeaders
          ? "'*'"
          : "''";
      } else {
        headers['method.response.header.Access-Control-Allow-Headers'] =
          `'${cors.allowHeaders.join(',')}'`;
      }
    } else {
      headers['method.response.header.Access-Control-Allow-Headers'] =
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'";
    }

    if (cors.exposeHeaders && cors.exposeHeaders.length > 0) {
      headers['method.response.header.Access-Control-Expose-Headers'] =
        `'${cors.exposeHeaders.join(',')}'`;
    }

    if (cors.allowCredentials) {
      headers['method.response.header.Access-Control-Allow-Credentials'] = "'true'";
    }

    const maxAge = cors.maxAge ?? 86400;
    headers['method.response.header.Access-Control-Max-Age'] = `'${maxAge}'`;

    return headers;
  }

  private buildMethodResponseParameters(
    corsHeaders: Record<string, string>
  ): Record<string, boolean> {
    const methodParameters: Record<string, boolean> = {};

    for (const headerKey of Object.keys(corsHeaders)) {
      methodParameters[headerKey] = false;
    }

    return methodParameters;
  }
}
