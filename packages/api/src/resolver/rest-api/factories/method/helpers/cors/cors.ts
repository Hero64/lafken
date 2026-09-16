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
          'application/json': this.buildOriginOverrideTemplate(cors) ?? '',
        },
        dependsOn: [corsMethod],
      }
    );

    return [corsMethod, corsIntegration, corsResponse, corsIntegrationResponse];
  }

  /**
   * `allowOrigins: false` disables CORS: no preflight method and no header on
   * any response.
   */
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
   * Builds the CORS headers that belong on an actual method response (as
   * opposed to the `OPTIONS` preflight): just the subset browsers check when
   * reading a real response body (`Access-Control-Allow-Origin`, plus
   * `-Credentials` / `-Expose-Headers` when configured).
   *
   * Returns an empty object for an error status (`4xx`/`5xx`) when
   * `cors.addToErrorResponses` is `false`.
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

  /**
   * Velocity template for the `OPTIONS` integration response that echoes back
   * the request `Origin` when it matches one of the origins past the first.
   *
   * `Access-Control-Allow-Origin` holds a single value, so a list of origins
   * cannot be rendered statically: the first one is mapped as a response
   * parameter and the rest are matched at runtime and applied through
   * `$context.responseOverride`. Returns `undefined` when there is nothing to
   * match, i.e. every case except an array of more than one origin.
   */
  public buildOriginOverrideTemplate(cors: NonNullable<CorsOptions>): string | undefined {
    const { allowOrigins } = cors;

    if (!Array.isArray(allowOrigins) || allowOrigins.length < 2) {
      return undefined;
    }

    const condition = allowOrigins
      .slice(1)
      .map((origin) => `$origin == "${origin}"`)
      .join(' || ');

    return [
      '#set($origin = $input.params().header.get("Origin"))',
      '#if($origin == "")',
      '  #set($origin = $input.params().header.get("origin"))',
      '#end',
      `#if(${condition})`,
      '  #set($context.responseOverride.header.Access-Control-Allow-Origin = $origin)',
      '#end',
    ].join('\n');
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

  /**
   * A response whose allowed origin is anything but `*` varies by request
   * origin, so caches must not reuse it across origins.
   */
  private withVary(headers: Record<string, string>): Record<string, string> {
    if (headers['method.response.header.Access-Control-Allow-Origin'] !== "'*'") {
      headers['method.response.header.Vary'] = "'Origin'";
    }

    return headers;
  }

  /**
   * Resolves the single value `Access-Control-Allow-Origin` is mapped to, and
   * rejects the configurations that cannot be expressed as one: an empty list,
   * `*` mixed with specific origins, and `*` together with credentials.
   *
   * Never called for a disabled `cors`, see {@link CorsHelper.isEnabled}.
   */
  private resolveAllowOrigin(cors: NonNullable<CorsOptions>): string {
    const { allowOrigins } = cors;

    if (Array.isArray(allowOrigins)) {
      if (allowOrigins.length === 0) {
        throw new Error(
          'cors.allowOrigins must contain at least one origin. Use true to allow every origin.'
        );
      }
      if (allowOrigins.includes('*') && allowOrigins.length > 1) {
        throw new Error(
          `cors.allowOrigins cannot mix '*' with specific origins: ${allowOrigins.join(', ')}`
        );
      }
    }

    if (
      allowOrigins !== undefined &&
      !Array.isArray(allowOrigins) &&
      typeof allowOrigins !== 'boolean' &&
      typeof allowOrigins !== 'string'
    ) {
      throw new Error(
        'cors.allowOrigins accepts a boolean, a string or an array of strings. A RegExp cannot be matched by API Gateway.'
      );
    }

    if (allowOrigins === false) {
      throw new Error('cors is disabled, resolveAllowOrigin must not be reached');
    }

    const origin =
      allowOrigins === undefined || allowOrigins === true
        ? '*'
        : Array.isArray(allowOrigins)
          ? allowOrigins[0]
          : allowOrigins;

    if (origin === '*' && cors.allowCredentials) {
      throw new Error(
        "cors.allowOrigins cannot be '*' when allowCredentials is true: browsers reject that pair. Name the allowed origins instead."
      );
    }

    return `'${origin}'`;
  }
}
