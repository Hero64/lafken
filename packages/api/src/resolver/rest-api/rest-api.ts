import { type AppModule, type AppStack, alicantoResource } from '@alicanto/resolver';
import { ApiGatewayDeployment } from '@cdktf/provider-aws/lib/api-gateway-deployment';
import {
  ApiGatewayRestApi,
  type ApiGatewayRestApiConfig,
} from '@cdktf/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayStage } from '@cdktf/provider-aws/lib/api-gateway-stage';
import { Construct } from 'constructs';
import type { RestApiProps } from '../resolver.types';
import { AuthorizerFactory } from './factories/authorizer/authorizer';
import { ResourceFactory } from './factories/resource/resource';
import { ValidatorFactory } from './factories/validator/validator';
import { ApiMethod } from './method/method';
import type { ApiMethodProps } from './method/method.types';

export class RestApi extends Construct {
  public api: ApiGatewayRestApi;
  public stage: ApiGatewayStage;

  public resourceFactory: ResourceFactory;
  public validatorFactory: ValidatorFactory;
  public authorizerFactory: AuthorizerFactory;

  constructor(
    private scope: AppStack,
    id: string,
    private props: RestApiProps
  ) {
    super(scope, id);
    this.createRestApi();
    this.createStageDeployment();
    this.resourceFactory = new ResourceFactory(this);
    this.validatorFactory = new ValidatorFactory(this);
    this.authorizerFactory = new AuthorizerFactory(this, props.auth?.authorizers || []);
  }

  public async addMethod(module: AppModule, props: Omit<ApiMethodProps, 'restApi'>) {
    const method = new ApiMethod(module, props.resourceMetadata.name, {
      ...props,
      restApi: this,
    });

    await method.create();
  }

  public createStageDeployment() {
    const deployment = new ApiGatewayDeployment(
      this.scope,
      `${this.props.name}-deployment`,
      {
        restApiId: this.api.id,
        triggers: {
          redeployment: Date.now().toString(),
        },
      }
    );

    this.stage = new ApiGatewayStage(this.scope, `${this.props.name}`, {
      ...(this.props.stage || {}),
      deploymentId: deployment.id,
      restApiId: this.api.id,
      stageName: this.getStageName(),
    });
  }

  private createRestApi() {
    const api = alicantoResource.create(
      'api',
      ApiGatewayRestApi,
      this.scope,
      this.props.name,
      this.parseRestApiOptions()
    );

    api.isGlobal();

    this.api = api;
  }

  private parseRestApiOptions(): ApiGatewayRestApiConfig {
    return {
      name: this.props.name,
      binaryMediaTypes: this.props.supportedMediaTypes,
      apiKeySource: this.props.apiKeySource
        ? this.props.apiKeySource.toUpperCase()
        : undefined,
      disableExecuteApiEndpoint: this.props.disableExecuteApiEndpoint,
      parameters: this.props.parameters,
      minimumCompressionSize: this.props.minCompressionSize
        ? this.props.minCompressionSize.toString()
        : undefined,
    };
  }

  private getStageName() {
    return this.props.stage?.stageName || 'api';
  }
}
