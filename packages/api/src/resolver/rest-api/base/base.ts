import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import { DataAwsRegion } from '@cdktn/provider-aws/lib/data-aws-region';
import { createSha256 } from '@lafken/resolver';
import type { Construct } from 'constructs';
import {
  type ApiDefaultResponseType,
  ApiGatewayResponse,
  type BaseApiProps,
  type RestApi,
  type RestApiProps,
  type Stage,
} from '../../resolver.types';
import { AuthorizerFactory } from '../factories/authorizer/authorizer';
import { DocsFactory } from '../factories/docs/docs.factories';
import { MethodFactory } from '../factories/method/method';
import type { CreateMethodProps } from '../factories/method/method.types';
import { ModelFactory } from '../factories/model/model';
import { OpenApiFactory } from '../factories/openapi/openapi';
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
    public openapiFactory!: OpenApiFactory;
    public vpcIds: string[];
    public stages: ApiGatewayStage[] = [];

    public initialize(props: BaseApiProps & Pick<RestApiProps, 'definition'>) {
      apiProps = props;
      const { definition = 'resource' } = props;
      createStages(props.stages);

      restApi = this as unknown as RestApi;
      this.openapiFactory = new OpenApiFactory(restApi, definition === 'openapi');
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

      if (this.openapiFactory.isEnabled) {
        this.openapiFactory.setDescription(apiProps.description);
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

    public openApiRegion?: DataAwsRegion;

    /**
     * Region reference for integration ARNs. In "resource" mode it is the REST
     * API's own `region` attribute (each integration is a separate resource, so
     * the reference is cross-resource). In "openapi" mode that same reference
     * would live inside the REST API's own `body`, producing a self-referential
     * block, so a dedicated `aws_region` data source is used instead.
     */
    public get regionRef(): string {
      if (!this.openapiFactory.isEnabled) {
        return (this as unknown as { region: string }).region;
      }

      this.openApiRegion ??= new DataAwsRegion(
        restApi,
        `${apiProps.name}-openapi-region`
      );
      return this.openApiRegion.region;
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

      const body = this.openapiFactory.finalize();

      const hasContent = this.openapiFactory.isEnabled
        ? this.openapiFactory.hasOperations
        : this.methodFactory.resources.length > 0;

      if (hasContent) {
        apiResources.push(...this.assignVpc());

        // In openapi mode the routes are created by importing the REST API
        // `body`, not by separate method/integration resources. The deployment
        // must therefore wait for the body import to finish before snapshotting
        // the API, otherwise it captures an empty API.
        if (this.openapiFactory.isEnabled) {
          apiResources.push(restApi as unknown as (typeof apiResources)[number]);
        }

        const deployment = new ApiGatewayDeployment(
          restApi,
          `${apiProps.name}-deployment`,
          {
            restApiId: restApi.id,
            dependsOn: apiResources,
            triggers: {
              redeployment: body ? createSha256(body) : Date.now().toString(),
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

        let statusCode = apiResponseStatusCode[key];
        let template = response;

        if (response instanceof ApiGatewayResponse) {
          statusCode = response.statusCode;
          template = response.template;
        }

        new ApiGatewayGatewayResponse(restApi, `${apiProps.name}-${responseKey}`, {
          restApiId: restApi.id,
          responseType: apiResponseName[key],
          statusCode: statusCode?.toString(),
          responseTemplates: {
            'application/json': JSON.stringify(template),
          },
          dependsOn: [restApi],
        });
      }
    }
  }

  return RestApiWithFactories;
}
