import type { AppModule } from '@alicanto/resolver';
import { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
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

    const method = new ApiGatewayMethod(
      restApi,
      `${resourceMetadata.name}-${handler.name}-method`,
      {
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
      }
    );
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
