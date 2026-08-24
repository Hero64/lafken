import { ApiGatewayDeployment } from '@cdktn/provider-aws/lib/api-gateway-deployment';
import type { ApiGatewayDocumentationVersion } from '@cdktn/provider-aws/lib/api-gateway-documentation-version';
import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { ApiGatewayMethodSettings } from '@cdktn/provider-aws/lib/api-gateway-method-settings';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import { DataAwsRegion } from '@cdktn/provider-aws/lib/data-aws-region';
import { createSha256 } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { MethodSettings } from '../../../main';
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
import {
  allMethodsPath,
  apiResponseName,
  apiResponseStatusCode,
  formatMethodSettings,
  logFormatValues,
} from './base.utils';

type Constructor = new (...args: any[]) => Construct;

export interface CreateMethodSettingsProps {
  stage: ApiGatewayStage;
  stageName: string;
  methodName: string;
  methodPath: string;
  settings: MethodSettings;
}

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
    public openApiRegion?: DataAwsRegion;

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

    public buildVpcPolicyStatement(resource: string) {
      return {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 'execute-api:Invoke',
            Resource: resource,
            Condition: {
              StringEquals: {
                'aws:SourceVpce': this.vpcIds,
              },
            },
          },
        ],
      };
    }

    public assignVpc() {
      if (!this.vpcIds || this.vpcIds.length === 0) {
        return [];
      }

      const identity = new DataAwsCallerIdentity(
        restApi,
        `${apiProps.name}-api-caller-identity`
      );

      if (this.openapiFactory.isEnabled) {
        this.assignOpenApiVpcPolicy(identity);
        return [];
      }

      const region = new DataAwsRegion(this, `${apiProps.name}-api-region`);
      const policy = new ApiGatewayRestApiPolicy(restApi, 'api-policy', {
        restApiId: restApi.id,
        policy: JSON.stringify(
          this.buildVpcPolicyStatement(
            `arn:aws:execute-api:${region.region}:${identity.accountId}:${restApi.id}/*`
          )
        ),
        dependsOn: [restApi],
      });

      return [policy];
    }

    /**
     * In openapi mode the policy is written twice, and neither write is
     * redundant:
     *
     * - `x-amazon-apigateway-policy` in the body, so that a policy change alters
     *   the body hash and forces a redeployment (a resource policy only takes
     *   effect on a stage after a new deployment).
     * - The REST API `policy` argument, because the provider re-applies that
     *   argument right after the OpenAPI import. Without it the imported policy
     *   is replaced by the stale value the provider reads back from state
     *   (hashicorp/terraform-provider-aws#38515).
     *
     * A separate `aws_api_gateway_rest_api_policy` cannot be used here: it
     * attaches the policy in a later graph step, and the deployment of a private
     * API then fails with "Private REST API doesn't have a resource policy
     * attached to it".
     */
    public assignOpenApiVpcPolicy(identity: DataAwsCallerIdentity) {
      this.openapiFactory.setPolicy(this.buildVpcPolicyStatement('execute-api:/*'));

      // The API id cannot be referenced from the API's own `policy` argument
      // without creating a self-referential block, so the ARN is wildcarded. A
      // resource policy only ever applies to the API it is attached to, so this
      // grants exactly what the body statement expands to.
      (restApi as unknown as { policy: string }).policy = JSON.stringify(
        this.buildVpcPolicyStatement(
          `arn:aws:execute-api:${this.regionRef}:${identity.accountId}:*/*`
        )
      );
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

      const hasContent = this.openapiFactory.isEnabled
        ? this.openapiFactory.hasOperations
        : this.methodFactory.resources.length > 0;

      if (hasContent) {
        apiResources.push(...this.assignVpc());
      }

      const body = this.openapiFactory.finalize();

      if (!hasContent) {
        return;
      }

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

      this.validateMethodSettingsStageNames();

      for (const stageProp of stageProps) {
        const stage = this.createStage(stageProp, deployment, version);
        this.stages.push(stage);
        this.createStageMethodSettings(stageProp, stage);
      }
    }

    public validateMethodSettingsStageNames() {
      if (this.methodFactory.settings.length === 0) {
        return;
      }

      const stageNames = new Set(stageProps.map((stage) => stage.stageName));
      const declared = new Set<string>();

      for (const { methodName, methodPath, stageName } of this.methodFactory.settings) {
        if (stageName && !stageNames.has(stageName)) {
          throw new Error(
            `method settings for "${methodName}" reference stage "${stageName}" but that stage is not configured in the "${apiProps.name}" API`
          );
        }

        const key = `${methodPath}::${stageName ?? '*'}`;

        if (declared.has(key)) {
          throw new Error(
            `method settings for "${methodName}" declare "${methodPath}" more than once${stageName ? ` on stage "${stageName}"` : ''} in the "${apiProps.name}" API`
          );
        }

        declared.add(key);
      }
    }

    public createStageMethodSettings(stageProp: Stage, stage: ApiGatewayStage) {
      const { stageName } = stageProp;
      const stageSettings = stageProp.methodSettings ?? apiProps.methodSettings;

      if (stageSettings) {
        this.createMethodSettings({
          stage,
          stageName,
          methodName: 'all-methods',
          methodPath: allMethodsPath,
          settings: stageSettings,
        });
      }

      for (const { methodName, methodPath, settings, stageName: scopedStage } of this
        .methodFactory.settings) {
        if (scopedStage && scopedStage !== stageName) {
          continue;
        }

        this.createMethodSettings({ stage, stageName, methodName, methodPath, settings });
      }
    }

    public createMethodSettings(props: CreateMethodSettingsProps) {
      const { stage, stageName, methodName, methodPath, settings } = props;

      return new ApiGatewayMethodSettings(
        restApi,
        `${apiProps.name}-${stageName}-${methodName}-method-settings`,
        {
          restApiId: restApi.id,
          stageName,
          methodPath,
          settings: formatMethodSettings(settings),
          dependsOn: [stage],
        }
      );
    }

    public createStage(
      stageProp: Stage,
      deployment: ApiGatewayDeployment,
      version?: ApiGatewayDocumentationVersion
    ) {
      const accessLogGroup = this.assignCloudwatchLog(
        stageProp.stageName,
        stageProp.accessLogSettings
      );

      const { methodSettings: _methodSettings, ...stageConfig } = stageProp;

      return new ApiGatewayStage(restApi, `${stageProp.stageName}-stage`, {
        ...stageConfig,
        deploymentId: deployment.id,
        restApiId: restApi.id,
        stageName: stageProp.stageName,
        documentationVersion: version?.version,
        accessLogSettings: this.buildAccessLogSettings(accessLogGroup, stageProp),
        dependsOn: [deployment],
      });
    }

    public buildAccessLogSettings(
      accessLogGroup: CloudwatchLogGroup | undefined,
      stageProp: Stage
    ) {
      if (!accessLogGroup) {
        return undefined;
      }

      const format = stageProp.accessLogSettings?.formatKeys.reduce(
        (acc, key) => {
          acc[key] = logFormatValues[key];
          return acc;
        },
        {} as Record<string, string>
      );

      return {
        destinationArn: accessLogGroup.arn,
        format: JSON.stringify(format),
      };
    }

    public addApiGatewayResponse() {
      const { defaultResponses = {} } = apiProps;
      for (const responseKey in defaultResponses) {
        const key = responseKey as ApiDefaultResponseType;
        const response = defaultResponses[key];
        if (!response) {
          continue;
        }

        const isCustomResponse = response instanceof ApiGatewayResponse;
        const statusCode = isCustomResponse
          ? response.statusCode
          : apiResponseStatusCode[key];
        const template = isCustomResponse ? response.template : response;
        const gatewayResponse = {
          statusCode: statusCode?.toString(),
          responseTemplates: {
            'application/json': JSON.stringify(template),
          },
        };

        if (this.openapiFactory.isEnabled) {
          this.openapiFactory.setGatewayResponse(apiResponseName[key], gatewayResponse);
          continue;
        }

        new ApiGatewayGatewayResponse(restApi, `${apiProps.name}-${responseKey}`, {
          restApiId: restApi.id,
          responseType: apiResponseName[key],
          ...gatewayResponse,
          dependsOn: [restApi],
        });
      }
    }
  }

  return RestApiWithFactories;
}
