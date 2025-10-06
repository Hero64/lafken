import type { AppModule } from '@alicanto/resolver';
import { ApiGatewayMethod } from '@cdktf/provider-aws/lib/api-gateway-method';
import { Construct } from 'constructs';
import { ParamHelper } from './helpers/param/param';
import { RequestHelper } from './helpers/request/request';
import type { IntegrationProps } from './integrations/integration.types';
import { LambdaIntegration } from './integrations/lambda/lambda';
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

    const fullPath = this.cleanPath(`${resourceMetadata.path}/${handler.path}`) || '/';
    const resourceId = restApi.resourceFactory.getResource(fullPath);
    const validatorId = restApi.validatorFactory.getValidator(
      requestHelper.getValidatorProperties()
    );
    const authorizationProps = await restApi.authorizerFactory.getAuthorizerProps(
      handler.auth ?? resourceMetadata.auth
    );

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
      }
    );
    await this.integrateMethod({
      ...this.props,
      fullPath,
      paramHelper,
      apiGatewayMethod: method,
    });
  }

  private async integrateMethod(props: IntegrationProps) {
    if (!props.handler.integration) {
      const integration = new LambdaIntegration(this, props);
      await integration.create();
    }
    return false;
  }

  private cleanPath(path: string) {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }
}
