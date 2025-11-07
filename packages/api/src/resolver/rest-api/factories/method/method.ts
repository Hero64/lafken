import { ApiGatewayIntegration } from '@cdktf/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktf/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktf/provider-aws/lib/api-gateway-method-response';
import type { TerraformResource } from 'cdktf';
import type { Construct } from 'constructs';
import type { CorsOptions } from '../../../resolver.types';
import type { RestApi } from '../../rest-api';
import { IntegrationHelper } from './helpers/integration/integration';
import { ParamHelper } from './helpers/param/param';
import { ProxyHelper } from './helpers/proxy/proxy';
import { RequestHelper } from './helpers/request/request';
import { ResponseHelper } from './helpers/response/response';
import { TemplateHelper } from './helpers/template/template';
import { DynamoDbIntegration } from './integrations/dynamodb/dynamodb';
import type { Integration, IntegrationProps } from './integrations/integration.types';
import { LambdaIntegration } from './integrations/lambda/lambda';
import { QueueIntegration } from './integrations/queue/queue';
import { BucketIntegration } from './integrations/s3/bucket';
import { StateMachineIntegration } from './integrations/state-machine/state-machine';
import type { CreateMethodProps } from './method.types';

export class MethodFactory {
  private methodResources: TerraformResource[] = [];

  constructor(private scope: RestApi) {}

  public async create(module: Construct, props: CreateMethodProps) {
    const { handler, resourceMetadata, classResource } = props;

    const paramHelper = new ParamHelper(classResource, handler.name);
    const requestHelper = new RequestHelper(paramHelper);
    const responseHelper = new ResponseHelper(handler);
    const templateHelper = new TemplateHelper();
    const proxyHelper = new ProxyHelper();
    const integrationHelper = new IntegrationHelper();

    const fullPath = this.cleanPath(`${resourceMetadata.path}/${handler.path}`) || '/';
    const resourceId = this.scope.resourceFactory.getResource(fullPath);
    const validatorId = this.scope.validatorFactory.getValidator(
      requestHelper.getValidatorProperties()
    );
    const authorizationProps = await this.scope.authorizerFactory.getAuthorizerProps({
      fullPath,
      method: handler.method,
      authorizer: handler.auth ?? resourceMetadata.auth,
    });

    let modelName: string | undefined;

    if (paramHelper.paramsBySource.body) {
      const payloadName = `${paramHelper.params.payload.id}Body`;

      const model = this.scope.modelFactory.getModel({
        field: {
          destinationName: 'body',
          name: 'body',
          type: 'Object',
          payload: {
            id: payloadName,
            name: payloadName,
          },
          properties: paramHelper.paramsBySource.body,
          validation: {},
        },
      });

      modelName = model.name;
    }

    const methodName = `${resourceMetadata.name}-${handler.name}-${handler.method.toLowerCase()}`;

    const method = new ApiGatewayMethod(this.scope, `${methodName}-method`, {
      ...authorizationProps,
      resourceId,
      restApiId: this.scope.id,
      httpMethod: handler.method,
      requestParameters: requestHelper.getRequestParameters(),
      requestValidatorId: validatorId,
      requestModels: modelName
        ? {
            'application/json': modelName,
          }
        : undefined,
    });

    this.corsMethod(methodName, resourceId, props);

    const integration = await this.integrateMethod({
      ...props,
      paramHelper,
      proxyHelper,
      responseHelper,
      templateHelper,
      integrationHelper,
      scope: module,
      restApi: this.scope,
      apiGatewayMethod: method,
    });

    this.methodResources.push(method, integration);
  }

  get resources() {
    return this.methodResources;
  }

  private corsMethod(methodName: string, resourceId: string, props: CreateMethodProps) {
    if (!props.cors) {
      return;
    }

    const { cors } = props;
    const corsHeaders = this.buildCorsHeaders(cors);

    const corsMethod = new ApiGatewayMethod(this.scope, `${methodName}-options-method`, {
      resourceId,
      restApiId: this.scope.id,
      httpMethod: 'OPTIONS',
      authorization: 'NONE',
    });

    const corsIntegration = new ApiGatewayIntegration(
      this.scope,
      `${methodName}-options-integration`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: this.scope.id,
        type: 'MOCK',
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }
    );

    const corsResponse = new ApiGatewayMethodResponse(
      this.scope,
      `${methodName}-options-method-response`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: this.scope.id,
        statusCode: '200',
        responseParameters: this.buildCorsMethodResponseParameters(corsHeaders),
      }
    );

    const corsIntegrationResponse = new ApiGatewayIntegrationResponse(
      this.scope,
      `${methodName}-options-integration-response`,
      {
        httpMethod: corsMethod.httpMethod,
        resourceId: corsMethod.resourceId,
        restApiId: this.scope.id,
        statusCode: '200',
        responseParameters: corsHeaders,
        responseTemplates: {
          'application/json': '',
        },
      }
    );

    this.methodResources.push(
      corsMethod,
      corsIntegration,
      corsResponse,
      corsIntegrationResponse
    );
  }

  private buildCorsHeaders(cors: NonNullable<CorsOptions>) {
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
      case 'state-machine': {
        integration = new StateMachineIntegration(props);
        break;
      }
      case 'queue': {
        integration = new QueueIntegration(props);
        break;
      }
      case 'dynamodb': {
        integration = new DynamoDbIntegration(props);
        break;
      }
      default: {
        integration = new LambdaIntegration(props);
      }
    }

    return integration.create();
  }

  private cleanPath(path: string) {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }
}
