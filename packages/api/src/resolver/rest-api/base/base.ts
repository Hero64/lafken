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
import { DocsFactory } from '../factories/docs/docs.factories';
import { MethodFactory } from '../factories/method/method';
import type { CreateMethodProps } from '../factories/method/method.types';
import { ModelFactory } from '../factories/model/model';
import { ResourceFactory } from '../factories/resource/resource';
import { ResponseFactory } from '../factories/response/response';
import { ValidatorFactory } from '../factories/validator/validator';
import { apiResponseName, apiResponseStatusCode, logFormatValues } from './base.utils';

type Constructor = new (...args: any[]) => Construct;

export function RestApiBase<TBase extends Constructor>(Base: TBase) {
  let apiProps!: BaseApiProps;
  let stageProps!: Stage[];
  let restApi: RestApi;

  const createStages = (apiStages: Stage[] = []) => {
    stageProps =
      (apiStages || []).length > 0
        ? (apiStages as Stage[])
        : [
            {
              stageName: 'api',
            },
          ];
  };
  class RestApiWithFactories extends Base {
    public resourceFactory!: ResourceFactory;
    public validatorFactory!: ValidatorFactory;
    public authorizerFactory!: AuthorizerFactory;
    public modelFactory!: ModelFactory;
    public responseFactory!: ResponseFactory;
    public docsFactory!: DocsFactory;
    public methodFactory!: MethodFactory;
    public vpcIds: string[];
    public stages: ApiGatewayStage[] = [];

    public initialize(props: BaseApiProps) {
      apiProps = props;
      createStages(props.stages);

      restApi = this as unknown as RestApi;
      this.resourceFactory = new ResourceFactory(restApi);
      this.validatorFactory = new ValidatorFactory(restApi);
      this.authorizerFactory = new AuthorizerFactory(
        restApi,
        props.auth?.authorizers || [],
        {
          defaultAuthorizer: props.auth?.defaultAuthorizerName,
          stageNames: stageProps.map((stage) => stage.stageName),
        }
      );
      this.modelFactory = new ModelFactory(restApi);
      this.docsFactory = new DocsFactory(restApi);
      this.responseFactory = new ResponseFactory(restApi);
      this.methodFactory = new MethodFactory(restApi);
      this.addApiGatewayResponse();
      this.addDocs();
    }

    public addDocs = () => {
      if (!apiProps.description) {
        return;
      }

      this.docsFactory.createDoc({
        id: `${apiProps.name}-api`,
        location: {
          type: 'API',
        },
        properties: {
          info: {
            description: apiProps.description,
          },
        },
      });
    };

    public async addMethod(module: Construct, props: CreateMethodProps) {
      await this.methodFactory.create(module, {
        ...props,
        cors: apiProps.cors,
      });
    }

    public assignVpc() {
      if (!this.vpcIds || this.vpcIds.length === 0) {
        return [];
      }

      const identity = new DataAwsCallerIdentity(
        restApi,
        `${apiProps.name}-api-caller-identity`
      );
      const region = new DataAwsRegion(this, `${apiProps.name}-api-region`);
      const policy = new ApiGatewayRestApiPolicy(restApi, 'api-policy', {
        restApiId: restApi.id,
        policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: 'execute-api:Invoke',
              Resource: `arn:aws:execute-api:${region.region}:${identity.accountId}:${restApi.id}/*`,
              Condition: {
                StringEquals: {
                  'aws:SourceVpce': this.vpcIds,
                },
              },
            },
          ],
        }),
        dependsOn: [restApi],
      });

      return [policy];
    }

    public assignCloudwatchLog(stageName: string, props?: Stage['accessLogSettings']) {
      if (!props) {
        return;
      }
      const accessLogGroup = new CloudwatchLogGroup(restApi, `${stageName}-access-logs`, {
        name: props.logGroupName,
        retentionInDays: props.retentionDays,
        dependsOn: [restApi],
      });

      return accessLogGroup;
    }

    public createStageDeployment() {
      const apiResources = [
        ...this.methodFactory.resources,
        ...this.resourceFactory.resources,
        ...this.validatorFactory.resources,
        ...this.authorizerFactory.resources,
        ...this.modelFactory.resources,
        ...this.responseFactory.resources,
        ...this.docsFactory.resources,
      ];

      const version = this.docsFactory.createVersion();

      if (version) {
        apiResources.push(version);
      }

      if (this.methodFactory.resources.length > 0) {
        apiResources.push(...this.assignVpc());

        const deployment = new ApiGatewayDeployment(
          restApi,
          `${apiProps.name}-deployment`,
          {
            restApiId: restApi.id,
            dependsOn: apiResources,
            triggers: {
              redeployment: Date.now().toString(),
            },
            lifecycle: {
              createBeforeDestroy: true,
            },
          }
        );

        for (const stageProp of stageProps) {
          const accessLogGroup = this.assignCloudwatchLog(
            stageProp.stageName,
            stageProp.accessLogSettings
          );

          const stage = new ApiGatewayStage(restApi, `${stageProp.stageName}-stage`, {
            ...(stageProp || {}),
            deploymentId: deployment.id,
            restApiId: restApi.id,
            stageName: stageProp.stageName,
            documentationVersion: version?.version,
            accessLogSettings: accessLogGroup
              ? {
                  destinationArn: accessLogGroup.arn,
                  format: JSON.stringify(
                    stageProp.accessLogSettings?.formatKeys.reduce(
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

          this.stages.push(stage);
        }
      }
    }

    public addApiGatewayResponse() {
      const { defaultResponses = {} } = apiProps;
      for (const responseKey in defaultResponses) {
        const key = responseKey as ApiDefaultResponseType;
        const response = defaultResponses[key];
        if (!response) {
          continue;
        }

        new ApiGatewayGatewayResponse(restApi, `${apiProps.name}-${responseKey}`, {
          restApiId: restApi.id,
          responseType: apiResponseName[key],
          statusCode: apiResponseStatusCode[key]?.toString(),
          responseTemplates: {
            'application/json': JSON.stringify(response),
          },
          dependsOn: [restApi],
        });
      }
    }
  }

  return RestApiWithFactories;
}
