import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import type { TerraformResource } from 'cdktn';
import type { Construct } from 'constructs';
import type { RestApi } from '../../../resolver.types';
import type { ModelRef } from '../model/model.types';
import type { OperationObject } from '../openapi/openapi.types';
import {
  corsToOptionsOperation,
  paramsToOpenApiParameters,
} from '../openapi/openapi.utils';
import { CorsHelper } from './helpers/cors/cors';
import { IntegrationHelper } from './helpers/integration/integration';
import { ParamHelper } from './helpers/param/param';
import { ProxyHelper } from './helpers/proxy/proxy';
import { RequestHelper } from './helpers/request/request';
import { ResponseHelper } from './helpers/response/response';
import { ResponseTemplateHelper } from './helpers/response-template/response-template';
import { TemplateHelper } from './helpers/template/template';
import { DynamoDbIntegration } from './integrations/dynamodb/dynamodb';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationProps,
  OpenApiIntegrationResult,
} from './integrations/integration.types';
import { KinesisIntegration } from './integrations/kinesis/kinesis';
import { LambdaIntegration } from './integrations/lambda/lambda';
import { MockIntegration } from './integrations/mock/mock';
import { QueueIntegration } from './integrations/queue/queue';
import { BucketIntegration } from './integrations/s3/bucket';
import { StateMachineIntegration } from './integrations/state-machine/state-machine';
import type { AddDocumentationProps, CreateMethodProps } from './method.types';

export class MethodFactory {
  private methodResources: TerraformResource[] = [];
  private corsHelper = new CorsHelper();

  constructor(private scope: RestApi) {}

  get resources() {
    return this.methodResources;
  }

  public async create(module: Construct, props: CreateMethodProps) {
    const { handler, resourceMetadata, classResource } = props;

    const paramHelper = new ParamHelper(classResource, handler.name);
    const requestHelper = new RequestHelper(paramHelper);
    const responseHelper = new ResponseHelper(handler);
    const templateHelper = new TemplateHelper(this.scope);
    const proxyHelper = new ProxyHelper();
    const integrationHelper = new IntegrationHelper();
    const responseTemplateHelper = new ResponseTemplateHelper();

    const fullPath = this.cleanPath(`/${resourceMetadata.path}/${handler.path}`) || '/';
    paramHelper.validateParamsInPath(fullPath);

    const validatorId = this.scope.validatorFactory.getValidator(
      requestHelper.getValidatorProperties()
    );

    const authorizerRequest = {
      fullPath,
      method: handler.method,
      authorizer: handler.auth ?? resourceMetadata.auth,
    };

    const model = this.resolveModel(paramHelper);
    const methodName = `${resourceMetadata.name}-${handler.name}-${handler.method.toLowerCase()}`;

    const integrationProps: OpenApiIntegrationProps = {
      ...props,
      paramHelper,
      proxyHelper,
      responseHelper,
      templateHelper,
      integrationHelper,
      responseTemplateHelper,
      scope: module,
      restApi: this.scope,
    };

    if (this.scope.openapiFactory.isEnabled) {
      const security =
        this.scope.authorizerFactory.getOperationSecurity(authorizerRequest);

      await this.createOpenApiOperation({
        fullPath,
        handler,
        resourceMetadata,
        paramHelper,
        validatorName: validatorId,
        model,
        integrationProps,
        cors: props.cors,
        security,
      });
      return;
    }

    const authorizationProps =
      await this.scope.authorizerFactory.getAuthorizerProps(authorizerRequest);

    const resourceId = this.scope.resourceFactory.getResource(fullPath);

    const method = new ApiGatewayMethod(this.scope, `${methodName}-method`, {
      ...authorizationProps,
      resourceId,
      restApiId: this.scope.id,
      httpMethod: handler.method,
      requestParameters: requestHelper.getRequestParameters(),
      requestValidatorId: validatorId,
      requestModels: model
        ? {
            'application/json': model.name,
          }
        : undefined,
    });

    if (props.cors) {
      const corsResources = this.corsHelper.createOptionsMethod(
        this.scope,
        methodName,
        resourceId,
        props.cors
      );
      this.methodResources.push(...corsResources);
    }

    const integration = await this.integrateMethod({
      ...integrationProps,
      apiGatewayMethod: method,
    });

    this.methodResources.push(method, integration);

    const docParams = {
      ...props,
      methodName,
      paramHelper,
      fullPath: `/${fullPath}`,
    };
    this.addMethodDocumentation(docParams);
    this.addParamsDocumentation(docParams);
  }

  private async createOpenApiOperation(ctx: {
    fullPath: string;
    handler: CreateMethodProps['handler'];
    resourceMetadata: CreateMethodProps['resourceMetadata'];
    paramHelper: ParamHelper;
    validatorName?: string;
    model?: ModelRef;
    integrationProps: OpenApiIntegrationProps;
    cors?: CreateMethodProps['cors'];
    security?: Array<Record<string, string[]>>;
  }) {
    const {
      fullPath,
      handler,
      resourceMetadata,
      paramHelper,
      validatorName,
      model,
      integrationProps,
      cors,
      security,
    } = ctx;

    const { integration, responses } = await this.integrateOpenApi(integrationProps);

    const operation: OperationObject = {
      summary: handler.summary,
      description: handler.description,
      tags: handler.tags || resourceMetadata.tags,
      parameters: paramsToOpenApiParameters(paramHelper.paramsBySource),
      requestBody: model
        ? {
            required: true,
            content: { 'application/json': { schema: { $ref: model.ref } } },
          }
        : undefined,
      responses:
        Object.keys(responses).length > 0 ? responses : { '200': { description: 'OK' } },
      security,
      'x-amazon-apigateway-integration': integration,
      'x-amazon-apigateway-request-validator': validatorName,
    };

    this.scope.openapiFactory.addOperation(fullPath, handler.method, operation);

    if (cors) {
      this.scope.openapiFactory.addOperation(
        fullPath,
        'OPTIONS',
        corsToOptionsOperation(this.corsHelper.buildHeaders(cors))
      );
    }
  }

  private async integrateOpenApi(
    props: OpenApiIntegrationProps
  ): Promise<OpenApiIntegrationResult> {
    const integration = this.selectIntegration(props as unknown as IntegrationProps);

    if (!integration.createOpenApi) {
      throw new Error(
        `integration "${props.handler.integration}" is not supported in openapi definition mode`
      );
    }

    return integration.createOpenApi();
  }

  private resolveModel(paramHelper: ParamHelper): ModelRef | undefined {
    if (!paramHelper.paramsBySource.body) {
      return undefined;
    }

    const payloadName = `${paramHelper.params.payload.id}Body`;

    return this.scope.modelFactory.getModel({
      field: {
        destinationName: 'body',
        name: 'body',
        type: 'Object',
        payload: {
          ...paramHelper.params.payload,
          id: payloadName,
          name: payloadName,
        },
        properties: paramHelper.paramsBySource.body,
      },
    });
  }

  private async integrateMethod(props: IntegrationProps) {
    return this.selectIntegration(props).create();
  }

  private selectIntegration(props: IntegrationProps): Integration {
    switch (props.handler.integration) {
      case 'bucket':
        return new BucketIntegration(props);
      case 'state-machine':
        return new StateMachineIntegration(props);
      case 'queue':
        return new QueueIntegration(props);
      case 'kinesis':
        return new KinesisIntegration(props);
      case 'dynamodb':
        return new DynamoDbIntegration(props);
      case 'mock':
        return new MockIntegration(props);
      default:
        return new LambdaIntegration(props);
    }
  }

  private cleanPath(path: string) {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  private addMethodDocumentation(props: AddDocumentationProps) {
    const { handler, resourceMetadata, fullPath, methodName } = props;

    if (
      !handler.description &&
      !handler.summary &&
      !handler.tags &&
      !resourceMetadata.tags
    ) {
      return;
    }

    this.scope.docsFactory.createDoc({
      id: methodName,
      location: {
        type: 'METHOD',
        method: handler.method,
        path: fullPath,
      },
      properties: {
        description: handler.description,
        tags: handler.tags || resourceMetadata.tags,
        summary: handler.summary,
      },
    });
  }

  private addParamsDocumentation(props: AddDocumentationProps) {
    const { paramHelper, methodName, handler, fullPath } = props;

    const { paramsBySource } = paramHelper;

    const params = [...(paramsBySource.query || []), ...(paramsBySource.path || [])];

    for (const param of params) {
      const { source, type, destinationName, name, ...properties } = param;

      this.scope.docsFactory.createDoc({
        id: `${param.name}-${methodName}-${handler.method}`,
        location: {
          type: source === 'path' ? 'PATH_PARAMETER' : 'QUERY_PARAMETER',
          method: handler.method,
          name: param.name,
          path: fullPath,
        },
        properties,
      });
    }
  }
}
