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
        dependsOn: [corsIntegration, corsResponse],
      }
    );

    return [corsMethod, corsIntegration, corsResponse, corsIntegrationResponse];
  }

  /** `allowOrigins: false` means no preflight method and no header anywhere. */
  public isEnabled(cors?: CorsOptions): cors is NonNullable<CorsOptions> {
    return cors !== undefined && cors.allowOrigins !== false;
  }

  public buildHeaders(cors: NonNullable<CorsOptions>): Record<string, string> {
    const headers: Record<string, string> = {
      'method.response.header.Access-Control-Allow-Origin': this.resolveAllowOrigin(cors),
    };

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

    return this.withVary(headers);
  }

  /**
   * The subset of CORS headers a real response needs, as opposed to the
   * `OPTIONS` preflight. Empty for a `4xx`/`5xx` when `addToErrorResponses`
   * is `false`.
   */
  public buildActualResponseHeaders(
    cors: NonNullable<CorsOptions>,
    statusCode: string
  ): Record<string, string> {
    const isError = Number(statusCode) >= 400;
    if (isError && cors.addToErrorResponses === false) {
      return {};
    }

    const headers: Record<string, string> = {
      'method.response.header.Access-Control-Allow-Origin': this.resolveAllowOrigin(cors),
    };

    if (cors.exposeHeaders && cors.exposeHeaders.length > 0) {
      headers['method.response.header.Access-Control-Expose-Headers'] =
        `'${cors.exposeHeaders.join(',')}'`;
    }

    if (cors.allowCredentials) {
      headers['method.response.header.Access-Control-Allow-Credentials'] = "'true'";
    }

    return this.withVary(headers);
  }

  /** Same headers, rekeyed for a gateway response's own prefix. */
  public buildGatewayResponseHeaders(
    cors: NonNullable<CorsOptions>
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.buildActualResponseHeaders(cors, '400')).map(([key, value]) => [
        key.replace('method.response.header.', 'gatewayresponse.header.'),
        value,
      ])
    );
  }

  public buildMethodResponseParameters(
    corsHeaders: Record<string, string>
  ): Record<string, boolean> {
    const methodParameters: Record<string, boolean> = {};

    for (const headerKey of Object.keys(corsHeaders)) {
      methodParameters[headerKey] = false;
    }

    return methodParameters;
  }

  /** A specific origin makes the response vary, so caches must not share it. */
  private withVary(headers: Record<string, string>): Record<string, string> {
    if (headers['method.response.header.Access-Control-Allow-Origin'] !== "'*'") {
      headers['method.response.header.Vary'] = "'Origin'";
    }

    return headers;
  }

  private resolveAllowOrigin(cors: NonNullable<CorsOptions>): string {
    const { allowOrigins } = cors;

    if (Array.isArray(allowOrigins)) {
      throw new Error(
        'cors.allowOrigins accepts a single origin. Access-Control-Allow-Origin holds one value and API Gateway cannot match a list, so name one origin per deployment.'
      );
    }

    if (
      allowOrigins !== undefined &&
      typeof allowOrigins !== 'boolean' &&
      typeof allowOrigins !== 'string'
    ) {
      throw new Error('cors.allowOrigins accepts a boolean or a string.');
    }

    if (allowOrigins === false) {
      throw new Error('cors is disabled, resolveAllowOrigin must not be reached');
    }

    const origin =
      allowOrigins === undefined || allowOrigins === true ? '*' : allowOrigins;

    if (origin === '*' && cors.allowCredentials) {
      throw new Error(
        "cors.allowOrigins cannot be '*' when allowCredentials is true: browsers reject that pair. Name the allowed origin instead."
      );
    }

    return `'${origin}'`;
  }
}
