import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import type { TerraformResource } from 'cdktn';
import type { Construct } from 'constructs';
import type { RestApi } from '../../../resolver.types';
import { CorsHelper } from './helpers/cors/cors';
import { IntegrationHelper } from './helpers/integration/integration';
import { ParamHelper } from './helpers/param/param';
import { ProxyHelper } from './helpers/proxy/proxy';
import { RequestHelper } from './helpers/request/request';
import { ResponseHelper } from './helpers/response/response';
import { ResponseTemplateHelper } from './helpers/response-template/response-template';
import { TemplateHelper } from './helpers/template/template';
import { DynamoDbIntegration } from './integrations/dynamodb/dynamodb';
import type { Integration, IntegrationProps } from './integrations/integration.types';
import { LambdaIntegration } from './integrations/lambda/lambda';
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

    const resourceId = this.scope.resourceFactory.getResource(fullPath);
    const validatorId = this.scope.validatorFactory.getValidator(
      requestHelper.getValidatorProperties()
    );
    const authorizationProps = await this.scope.authorizerFactory.getAuthorizerProps({
      fullPath,
      method: handler.method,
      authorizer: handler.auth ?? resourceMetadata.auth,
    });

    const modelName = this.resolveModelName(paramHelper);
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
      ...props,
      paramHelper,
      proxyHelper,
      responseHelper,
      templateHelper,
      integrationHelper,
      responseTemplateHelper,
      scope: module,
      restApi: this.scope,
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

  private resolveModelName(paramHelper: ParamHelper): string | undefined {
    if (!paramHelper.paramsBySource.body) {
      return undefined;
    }

    const payloadName = `${paramHelper.params.payload.id}Body`;

    const model = this.scope.modelFactory.getModel({
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

    return model.name;
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
