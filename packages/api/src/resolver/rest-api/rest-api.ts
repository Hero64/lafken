import { alicantoResource } from '@alicanto/resolver';
import { ApiGatewayDeployment } from '@cdktf/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayRestApi } from '@cdktf/provider-aws/lib/api-gateway-rest-api';
import { ApiGatewayStage } from '@cdktf/provider-aws/lib/api-gateway-stage';
import type { Construct } from 'constructs';
import type { RestApiProps } from '../resolver.types';
import { AuthorizerFactory } from './factories/authorizer/authorizer';
import { MethodFactory } from './factories/method/method';
import type { CreateMethodProps } from './factories/method/method.types';
import { ModelFactory } from './factories/model/model';
import { ResourceFactory } from './factories/resource/resource';
import { ResponseFactory } from './factories/response/response';
import { ValidatorFactory } from './factories/validator/validator';

export class RestApi extends alicantoResource.make(ApiGatewayRestApi) {
  public stageName: string;

  public resourceFactory: ResourceFactory;
  public validatorFactory: ValidatorFactory;
  public authorizerFactory: AuthorizerFactory;
  public modelFactory: ModelFactory;
  public responseFactory: ResponseFactory;
  private methodFactory: MethodFactory;

  constructor(
    scope: Construct,
    id: string,
    private props: RestApiProps
  ) {
    super(scope, `${id}-api`, {
      name: props.name,
      binaryMediaTypes: props.supportedMediaTypes,
      apiKeySource: props.apiKeySource ? props.apiKeySource.toUpperCase() : undefined,
      disableExecuteApiEndpoint: props.disableExecuteApiEndpoint,
      minimumCompressionSize: props.minCompressionSize
        ? props.minCompressionSize.toString()
        : undefined,
    });
    this.isGlobal('api');
    this.stageName = this.getStageName();
    this.resourceFactory = new ResourceFactory(this);
    this.validatorFactory = new ValidatorFactory(this);
    this.authorizerFactory = new AuthorizerFactory(
      this,
      props.auth?.authorizers || [],
      props.auth?.defaultAuthorizerName
    );
    this.modelFactory = new ModelFactory(this);
    this.responseFactory = new ResponseFactory(this);
    this.methodFactory = new MethodFactory(this);
  }

  public async addMethod(module: Construct, props: CreateMethodProps) {
    await this.methodFactory.create(module, {
      ...props,
      cors: this.props.cors,
    });
  }

  public createStageDeployment() {
    const apiResources = [
      ...this.methodFactory.resources,
      ...this.resourceFactory.resources,
      ...this.validatorFactory.resources,
      ...this.authorizerFactory.resources,
      ...this.modelFactory.resources,
      ...this.responseFactory.resources,
    ];

    const deployment = new ApiGatewayDeployment(this, `${this.props.name}-deployment`, {
      restApiId: this.id,
      dependsOn: apiResources,
      triggers: {
        redeployment: Date.now().toString(),
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
    });

    new ApiGatewayStage(this, `${this.props.name}-stage`, {
      ...(this.props.stage || {}),
      deploymentId: deployment.id,
      restApiId: this.id,
      stageName: this.getStageName(),
      dependsOn: [deployment],
    });
  }

  private getStageName() {
    return this.props.stage?.stageName || 'api';
  }
}
