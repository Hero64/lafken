import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import type { Construct } from 'constructs';
import type { BaseApiProps, RestApi } from '../../resolver.types';
import { AuthorizerFactory } from '../factories/authorizer/authorizer';
import { MethodFactory } from '../factories/method/method';
import type { CreateMethodProps } from '../factories/method/method.types';
import { ModelFactory } from '../factories/model/model';
import { ResourceFactory } from '../factories/resource/resource';
import { ResponseFactory } from '../factories/response/response';
import { ValidatorFactory } from '../factories/validator/validator';

type Constructor = new (...args: any[]) => Construct;

export function RestApiBase<TBase extends Constructor>(Base: TBase) {
  class RestApiWithFactories extends Base {
    public stageName!: string;
    public resourceFactory!: ResourceFactory;
    public validatorFactory!: ValidatorFactory;
    public authorizerFactory!: AuthorizerFactory;
    public modelFactory!: ModelFactory;
    public responseFactory!: ResponseFactory;
    #methodFactory!: MethodFactory;
    #baseProps!: BaseApiProps;

    public initFactories(props: BaseApiProps) {
      this.#baseProps = props;
      this.stageName = props.stage?.stageName || 'api';
      const self = this as unknown as RestApi;
      this.resourceFactory = new ResourceFactory(self);
      this.validatorFactory = new ValidatorFactory(self);
      this.authorizerFactory = new AuthorizerFactory(
        self,
        props.auth?.authorizers || [],
        props.auth?.defaultAuthorizerName
      );
      this.modelFactory = new ModelFactory(self);
      this.responseFactory = new ResponseFactory(self);
      this.#methodFactory = new MethodFactory(self);
    }

    public async addMethod(module: Construct, props: CreateMethodProps) {
      await this.#methodFactory.create(module, {
        ...props,
        cors: this.#baseProps.cors,
      });
    }

    public createStageDeployment() {
      const self = this as unknown as RestApi;
      const apiResources = [
        ...this.#methodFactory.resources,
        ...this.resourceFactory.resources,
        ...this.validatorFactory.resources,
        ...this.authorizerFactory.resources,
        ...this.modelFactory.resources,
        ...this.responseFactory.resources,
      ];

      const deployment = new ApiGatewayDeployment(
        self,
        `${this.#baseProps.name}-deployment`,
        {
          restApiId: self.id,
          dependsOn: apiResources,
          triggers: {
            redeployment: Date.now().toString(),
          },
          lifecycle: {
            createBeforeDestroy: true,
          },
        }
      );

      const stage = new ApiGatewayStage(self, `${this.#baseProps.name}-stage`, {
        ...(this.#baseProps.stage || {}),
        deploymentId: deployment.id,
        restApiId: self.id,
        stageName: this.stageName,
        dependsOn: [deployment],
      });

      this.authorizerFactory.assignStage(stage);
    }
  }

  return RestApiWithFactories;
}
