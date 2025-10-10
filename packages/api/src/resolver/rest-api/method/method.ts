import type { AppModule } from '@alicanto/resolver';
import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import { Construct } from 'constructs';
import { IntegrationHelper } from './helpers/integration/integration';
import { ParamHelper } from './helpers/param/param';
import { ProxyHelper } from './helpers/proxy/proxy';
import { RequestHelper } from './helpers/request/request';
import { ResponseHelper } from './helpers/response/response';
import { TemplateHelper } from './helpers/template/template';
import type { Integration, IntegrationProps } from './integrations/integration.types';
import { LambdaIntegration } from './integrations/lambda/lambda';
import { BucketIntegration } from './integrations/s3/bucket';
import type { ApiMethodProps } from './method.types';

export class ApiMethod extends Construct {
  constructor(
    scope: AppModule,
    id: string,
    private props: ApiMethodProps
  ) {
    super(scope, id);
  }

  public async create() {
    const { handler, resourceMetadata, classResource, restApi } = this.props;

    const paramHelper = new ParamHelper(classResource, handler.name);
    const requestHelper = new RequestHelper(paramHelper);
    const responseHelper = new ResponseHelper(handler);
    const templateHelper = new TemplateHelper();
    const proxyHelper = new ProxyHelper();
    const integrationHelper = new IntegrationHelper();

    const fullPath = this.cleanPath(`${resourceMetadata.path}/${handler.path}`) || '/';
    const resourceId = restApi.resourceFactory.getResource(fullPath);
    const validatorId = restApi.validatorFactory.getValidator(
      requestHelper.getValidatorProperties()
    );
    const authorizationProps = await restApi.authorizerFactory.getAuthorizerProps(
      handler.auth ?? resourceMetadata.auth
    );

    let modelId: string | undefined;

    if (paramHelper.paramsBySource.body) {
      const payloadName = `${paramHelper.params.payload.id}-body`;

      const model = this.props.restApi.modelFactory.getModel({
        destinationName: 'body',
        name: 'body',
        type: 'Object',
        payload: {
          id: payloadName,
          name: payloadName,
        },
        properties: paramHelper.paramsBySource.body,
        validation: {},
      });

      modelId = model.id;
    }

    const methodName = `${resourceMetadata.name}-${handler.name}-${handler.method.toLowerCase()}`;

    const method = new ApiGatewayMethod(restApi, `${methodName}-method`, {
      ...authorizationProps,
      resourceId,
      restApiId: restApi.api.id,
      httpMethod: handler.method.toLowerCase(),
      requestParameters: requestHelper.getRequestParameters(),
      requestValidatorId: validatorId,
      requestModels: modelId
        ? {
            'application/json': modelId,
          }
        : undefined,
    });
    await this.integrateMethod({
      ...this.props,
      fullPath,
      paramHelper,
      proxyHelper,
      responseHelper,
      templateHelper,
      integrationHelper,
      apiGatewayMethod: method,
    });

    this.corsMethod(methodName, resourceId);
  }

  private corsMethod(methodName: string, resourceId: string) {
    if (!this.props.cors) {
      return;
    }

    const { cors, restApi } = this.props;
    const corsHeaders = this.buildCorsHeaders(cors);

    const optionsMethod = new ApiGatewayMethod(restApi, `${methodName}-options-method`, {
      resourceId,
      restApiId: restApi.api.id,
      httpMethod: 'OPTIONS',
      authorization: 'NONE',
    });

    new ApiGatewayIntegration(restApi, `${methodName}-options-integration`, {
      httpMethod: optionsMethod.httpMethod,
      resourceId: optionsMethod.resourceId,
      restApiId: restApi.api.id,
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    });

    new ApiGatewayMethodResponse(restApi, `${methodName}-options-method-response`, {
      httpMethod: optionsMethod.httpMethod,
      resourceId: optionsMethod.resourceId,
      restApiId: restApi.api.id,
      statusCode: '200',
      responseParameters: this.buildCorsMethodResponseParameters(corsHeaders),
    });

    new ApiGatewayIntegrationResponse(
      restApi,
      `${methodName}-options-integration-response`,
      {
        httpMethod: optionsMethod.httpMethod,
        resourceId: optionsMethod.resourceId,
        restApiId: restApi.api.id,
        statusCode: '200',
        responseParameters: corsHeaders,
        responseTemplates: {
          'application/json': '',
        },
      }
    );
  }

  private buildCorsHeaders(cors: NonNullable<typeof this.props.cors>) {
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

  private buildCorsMethodResponseParameters(corsHeaders: Record<string, string>) {
    const methodParameters: Record<string, boolean> = {};

    for (const headerKey of Object.keys(corsHeaders)) {
      methodParameters[headerKey] = false;
    }

    return methodParameters;
  }

  private async integrateMethod(props: IntegrationProps) {
    const { handler } = props;
    let integration: Integration | undefined;

    switch (handler.integration) {
      case 'bucket': {
        integration = new BucketIntegration(props);
        break;
      }
      default: {
        integration = new LambdaIntegration(this, props);
      }
    }

    await integration.create();
    return false;
  }

  private cleanPath(path: string) {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }
}
