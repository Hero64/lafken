import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { getMetadataPrototypeByKey } from '@lafken/common';
import type { TerraformResource } from 'cdktn';
import type { Construct } from 'constructs';
import {
  EVENT_PROXY_METADATA_KEY,
  type MethodSettingsConfig,
  type StageMethodSettings,
} from '../../../../main';
import type { RestApi } from '../../../resolver.types';
import type { DocLocation, DocMethodProperties } from '../docs/docs.types';
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
import { EventBridgeIntegration } from './integrations/event-bridge/event-bridge';
import type {
  Integration,
  IntegrationProps,
  OpenApiIntegrationProps,
  OpenApiIntegrationResult,
} from './integrations/integration.types';
import { isStreamingHandler } from './integrations/integration.utils';
import { KinesisIntegration } from './integrations/kinesis/kinesis';
import { LambdaIntegration } from './integrations/lambda/lambda';
import { MockIntegration } from './integrations/mock/mock';
import { QueueIntegration } from './integrations/queue/queue';
import { BucketIntegration } from './integrations/s3/bucket';
import { StateMachineIntegration } from './integrations/state-machine/state-machine';
import type {
  AddDocumentationProps,
  CreateMethodProps,
  MethodSettingsEntry,
  RegisterMethodSettingsProps,
} from './method.types';

export class MethodFactory {
  private methodResources: TerraformResource[] = [];
  private methodSettings: MethodSettingsEntry[] = [];
  private corsHelper = new CorsHelper();

  constructor(private scope: RestApi) {}

  get resources() {
    return this.methodResources;
  }

  get settings() {
    return this.methodSettings;
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

    this.validateIntegrationType(props, paramHelper);

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

    this.registerMethodSettings({ handler, resourceMetadata, fullPath, methodName });

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
        methodName,
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
    methodName: string;
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
      methodName,
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

    const docParams = {
      handler,
      resourceMetadata,
      paramHelper,
      methodName,
      fullPath: `/${fullPath}`,
    };
    this.addMethodDocumentation(docParams);
    this.addParamsDocumentation(docParams);
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

  private validateIntegrationType(props: CreateMethodProps, paramHelper: ParamHelper) {
    const { handler, resourceMetadata, classResource } = props;

    // Only the default Lambda integration honours `integrationType`.
    if (handler.integration) {
      return;
    }

    const integrationType = handler.integrationType ?? 'aws';
    const isProxy = integrationType === 'aws-proxy';
    const where = `Handler "${handler.name}" in resource "${resourceMetadata.name}"`;

    const usesProxyEvent = Boolean(
      getMetadataPrototypeByKey<Record<string, boolean>>(
        classResource,
        EVENT_PROXY_METADATA_KEY
      )?.[handler.name]
    );
    const usesEvent = Boolean(paramHelper.params) && !usesProxyEvent;

    if (isStreamingHandler(props) && !isProxy) {
      throw new Error(
        `${where} is decorated with @Streaming(), which requires integrationType: 'aws-proxy'.`
      );
    }

    if (isProxy && usesEvent) {
      throw new Error(
        `${where} uses integrationType: 'aws-proxy'; use @EventProxy() instead of @Event() to receive the raw APIGatewayProxyEvent.`
      );
    }

    if (!isProxy && usesProxyEvent) {
      throw new Error(
        `${where} uses @EventProxy(), which requires integrationType: 'aws-proxy'.`
      );
    }
  }

  private selectIntegration(props: IntegrationProps): Integration {
    if (props.handler.integration && isStreamingHandler(props)) {
      throw new Error(
        `Handler "${props.handler.name}" in resource "${props.resourceMetadata.name}" is decorated with @Streaming(), which is only supported by the default Lambda integration, but it is configured to use the "${props.handler.integration}" integration.`
      );
    }

    switch (props.handler.integration) {
      case 'bucket':
        return new BucketIntegration(props);
      case 'state-machine':
        return new StateMachineIntegration(props);
      case 'queue':
        return new QueueIntegration(props);
      case 'kinesis':
        return new KinesisIntegration(props);
      case 'event-bridge':
        return new EventBridgeIntegration(props);
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

  /**
   * API Gateway keys method settings as `{resource_path}/{http_method}`, with
   * the leading slash of the resource path trimmed, e.g. `/users/{id}` with
   * `GET` becomes `users/{id}/GET`. The root resource keeps its slash, as
   * trimming it would leave the resource path empty.
   */
  private buildMethodPath(fullPath: string, method: string) {
    return fullPath === '/' ? `/${method}` : `${fullPath}/${method}`;
  }

  private normalizeMethodSettings(
    methodName: string,
    fullPath: string,
    method: string,
    methodSettings: MethodSettingsConfig
  ): MethodSettingsEntry[] {
    const methodPath = this.buildMethodPath(fullPath, method);

    if (Array.isArray(methodSettings)) {
      return methodSettings.map(({ stageName, ...settings }: StageMethodSettings) => ({
        methodName,
        methodPath,
        stageName,
        settings,
      }));
    }

    return [{ methodName, methodPath, settings: methodSettings }];
  }

  /**
   * Registers the method settings entries contributed by a handler.
   *
   * Class-level settings are inherited by every handler and are always
   * rendered against that handler's concrete resource path and HTTP method.
   * For example, `@Api({ path: '/users' })` produces `users/POST` and
   * `users/{id}/GET`, never `users/*`. Handlers declaring their own settings
   * take precedence over the class ones.
   */
  private registerMethodSettings(props: RegisterMethodSettingsProps) {
    const { handler, resourceMetadata, fullPath, methodName } = props;
    const classSettings = resourceMetadata.methodSettings;
    const settings = handler.methodSettings ?? classSettings;

    if (!settings) {
      return;
    }

    this.methodSettings.push(
      ...this.normalizeMethodSettings(methodName, fullPath, handler.method, settings)
    );
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

    const location: DocLocation = {
      type: 'METHOD',
      method: handler.method,
      path: fullPath,
    };
    const properties: DocMethodProperties = {
      description: handler.description,
      tags: handler.tags || resourceMetadata.tags,
      summary: handler.summary,
    };

    if (this.scope.openapiFactory.isEnabled) {
      this.scope.openapiFactory.addDocumentationPart(location, properties);
      return;
    }

    this.scope.docsFactory.createDoc({ id: methodName, location, properties });
  }

  private addParamsDocumentation(props: AddDocumentationProps) {
    const { paramHelper, methodName, handler, fullPath } = props;

    const { paramsBySource } = paramHelper;

    const params = [...(paramsBySource.query || []), ...(paramsBySource.path || [])];

    for (const param of params) {
      const { source, type, destinationName, name, ...properties } = param;
      const location: DocLocation = {
        type: source === 'path' ? 'PATH_PARAMETER' : 'QUERY_PARAMETER',
        method: handler.method,
        name: param.name,
        path: fullPath,
      };

      if (this.scope.openapiFactory.isEnabled) {
        this.scope.openapiFactory.addDocumentationPart(location, properties);
        continue;
      }

      this.scope.docsFactory.createDoc({
        id: `${param.name}-${methodName}-${handler.method}`,
        location,
        properties,
      });
    }
  }
}
