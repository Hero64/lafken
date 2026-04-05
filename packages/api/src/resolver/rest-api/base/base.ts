import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import { DataAwsRegion } from '@cdktn/provider-aws/lib/data-aws-region';
import type { Construct } from 'constructs';
import type {
  ApiDefaultResponseType,
  BaseApiProps,
  RestApi,
  Stage,
} from '../../resolver.types';
import { AuthorizerFactory } from '../factories/authorizer/authorizer';
import { MethodFactory } from '../factories/method/method';
import type { CreateMethodProps } from '../factories/method/method.types';
import { ModelFactory } from '../factories/model/model';
import { ResourceFactory } from '../factories/resource/resource';
import { ResponseFactory } from '../factories/response/response';
import { ValidatorFactory } from '../factories/validator/validator';
import { apiResponseName, apiResponseStatusCode, logFormatValues } from './base.utils';

type Constructor = new (...args: any[]) => Construct;

export function RestApiBase<TBase extends Constructor>(Base: TBase) {
  class RestApiWithFactories extends Base {
    public resourceFactory!: ResourceFactory;
    public validatorFactory!: ValidatorFactory;
    public authorizerFactory!: AuthorizerFactory;
    public modelFactory!: ModelFactory;
    public responseFactory!: ResponseFactory;
    public vpcIds: string[];

    _methodFactory!: MethodFactory;
    _baseProps!: BaseApiProps;
    _stages!: Stage[];

    public initFactories(props: BaseApiProps) {
      this._baseProps = props;

      this._stages =
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
          stageNames: this._stages.map((stage) => stage.stageName),
        }
      );
      this.modelFactory = new ModelFactory(self);
      this.responseFactory = new ResponseFactory(self);
      this._methodFactory = new MethodFactory(self);
      this.addApiGatewayResponse();
    }

    public async addMethod(module: Construct, props: CreateMethodProps) {
      await this._methodFactory.create(module, {
        ...props,
        cors: this._baseProps.cors,
      });
    }

    public createStageDeployment() {
      const self = this as unknown as RestApi;
      const apiResources = [
        ...this._methodFactory.resources,
        ...this.resourceFactory.resources,
        ...this.validatorFactory.resources,
        ...this.authorizerFactory.resources,
        ...this.modelFactory.resources,
        ...this.responseFactory.resources,
      ];

      if (this._methodFactory.resources.length > 0) {
        if (this.vpcIds) {
          const identity = new DataAwsCallerIdentity(
            self,
            `${this._baseProps.name}-api-caller-identity`
          );
          const region = new DataAwsRegion(this, `${this._baseProps.name}-api-region`);
          const policy = new ApiGatewayRestApiPolicy(self, 'api-policy', {
            restApiId: self.id,
            policy: JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 'execute-api:Invoke',
                  Resource: `arn:aws:execute-api:${region.name}:${identity.accountId}:${self.id}/*`,
                  Condition: {
                    StringEquals: {
                      'aws:SourceVpce': self.vpcIds,
                    },
                  },
                },
              ],
            }),
          });

          apiResources.push(policy);
        }

        const deployment = new ApiGatewayDeployment(
          self,
          `${this._baseProps.name}-deployment`,
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

        for (const stageProps of this._stages) {
          let accessLogGroup: CloudwatchLogGroup | undefined;
          if (stageProps.accessLogSettings) {
            accessLogGroup = new CloudwatchLogGroup(
              self,
              `${stageProps.stageName}-access-logs`,
              {
                name: stageProps.accessLogSettings.accessLogGroupKey,
                retentionInDays: 30,
              }
            );
          }

          new ApiGatewayStage(self, `${stageProps.stageName}-stage`, {
            ...(stageProps || {}),
            deploymentId: deployment.id,
            restApiId: self.id,
            stageName: stageProps.stageName,
            accessLogSettings: accessLogGroup
              ? {
                  destinationArn: accessLogGroup.arn,
                  format: JSON.stringify(
                    stageProps.accessLogSettings?.formatKeys.reduce(
                      (acc, key) => {
                        acc[key] = logFormatValues[key];
                        return acc;
                      },
                      {} as Record<string, string>
                    )
                  ),
                }
              : undefined,
            dependsOn: [deployment],
          });
        }
      }
    }

    public addApiGatewayResponse() {
      const self = this as unknown as RestApi;
      const { defaultResponses = {} } = this._baseProps;
      for (const responseKey in defaultResponses) {
        const key = responseKey as ApiDefaultResponseType;
        const response = defaultResponses[key];
        if (!response) {
          continue;
        }

        new ApiGatewayGatewayResponse(self, `${this._baseProps.name}-${responseKey}`, {
          restApiId: self.id,
          responseType: apiResponseName[key],
          statusCode: apiResponseStatusCode[key]?.toString(),
          responseTemplates: {
            'application/json': JSON.stringify(response),
          },
        });
      }
    }
  }

  return RestApiWithFactories;
}
