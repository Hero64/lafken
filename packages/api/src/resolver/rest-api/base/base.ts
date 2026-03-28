import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import type { Construct } from 'constructs';
import type { BaseApiProps, RestApi, Stage } from '../../resolver.types';
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
    public resourceFactory!: ResourceFactory;
    public validatorFactory!: ValidatorFactory;
    public authorizerFactory!: AuthorizerFactory;
    public modelFactory!: ModelFactory;
    public responseFactory!: ResponseFactory;
    #methodFactory!: MethodFactory;
    #baseProps!: BaseApiProps;
    #stages!: Stage[];

    public initFactories(props: BaseApiProps) {
      this.#baseProps = props;

      this.#stages =
        (props.stages || []).length > 0
          ? (props.stages as Stage[])
          : [
              {
                stageName: 'api',
              },
            ];

      const self = this as unknown as RestApi;
      this.resourceFactory = new ResourceFactory(self);
      this.validatorFactory = new ValidatorFactory(self);
      this.authorizerFactory = new AuthorizerFactory(
        self,
        props.auth?.authorizers || [],
        {
          defaultAuthorizer: props.auth?.defaultAuthorizerName,
          stageNames: this.#stages.map((stage) => stage.stageName),
        }
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

      if (this.#methodFactory.resources.length > 0) {
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

        for (const stageProps of this.#stages) {
          new ApiGatewayStage(self, `${this.#baseProps.name}-stage`, {
            ...(stageProps || {}),
            deploymentId: deployment.id,
            restApiId: self.id,
            stageName: stageProps.stageName,
            dependsOn: [deployment],
          });
        }
      }
    }
  }

  return RestApiWithFactories;
}
