import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiGatewayApiKey } from '@cdktn/provider-aws/lib/api-gateway-api-key';
import { ApiGatewayAuthorizer } from '@cdktn/provider-aws/lib/api-gateway-authorizer';
import type { ApiGatewayMethodConfig } from '@cdktn/provider-aws/lib/api-gateway-method';
import type { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { ApiGatewayUsagePlan } from '@cdktn/provider-aws/lib/api-gateway-usage-plan';
import { ApiGatewayUsagePlanKey } from '@cdktn/provider-aws/lib/api-gateway-usage-plan-key';
import type { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import {
  type ClassResource,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
} from '@lafken/common';
import { LambdaHandler, lafkenResource, lambdaAssets } from '@lafken/resolver';
import type { TerraformResource } from 'cdktn';
import {
  ApiAuthorizerType,
  AuthorizerReflectKeys,
  type MethodAuthorizer,
  PERMISSION_DEFINITION_FILE,
} from '../../../../main';
import type { RestApi } from '../../rest-api';
import type {
  AuthorizerData,
  AuthorizerDataApiKey,
  AuthorizerDataCognito,
  AuthorizerDataCustom,
  AuthPermissions,
  GetAuthorizerProps,
} from './authorizer.types';

export class AuthorizerFactory {
  private authorizerIds: Record<string, string> = {};
  private authorizerMetadata: Record<string, AuthorizerData> = {};
  private authResources: TerraformResource[] = [];
  private defaultAuthorizer?: MethodAuthorizer;
  private usagePlans: ApiGatewayUsagePlan[] = [];

  constructor(
    private scope: RestApi,
    authorizerResources: ClassResource[],
    defaultAuthorizer?: string
  ) {
    if (defaultAuthorizer) {
      this.defaultAuthorizer = {
        authorizerName: defaultAuthorizer,
      };
    }

    for (const resource of authorizerResources) {
      const metadata = getResourceMetadata<any>(resource);
      this.authorizerMetadata[metadata.name] = {
        resource,
        metadata,
        type: metadata.type as ApiAuthorizerType,
      };
    }
  }

  public getAuthorizerProps(props: GetAuthorizerProps) {
    const { authorizer, fullPath, method } = props;
    if (
      authorizer === false ||
      (!authorizer?.authorizerName && !this.defaultAuthorizer)
    ) {
      return {
        authorization: 'NONE',
      };
    }

    const authorizerMethod: MethodAuthorizer = {
      authorizerName:
        authorizer?.authorizerName || this.defaultAuthorizer?.authorizerName,
      scopes: authorizer?.scopes,
    };
    const id = authorizerMethod.authorizerName as string;

    const authorizerMetadata = this.authorizerMetadata[id];
    if (!authorizerMetadata) {
      throw new Error(`authorized ${id} not found`);
    }

    switch (authorizerMetadata.type) {
      case ApiAuthorizerType.custom: {
        if (!this.authorizerIds[id]) {
          this.createCustomAuthorizer(id, authorizerMetadata);
        }
        const customAuthorizerMetadata = authorizerMetadata as AuthorizerDataCustom;

        const authorizerPath = fullPath?.[0] === '/' ? fullPath : `/${fullPath}`;
        if (authorizer?.scopes?.length) {
          customAuthorizerMetadata.pathScopes ??= {};
          customAuthorizerMetadata.pathScopes[authorizerPath] ??= {};
          customAuthorizerMetadata.pathScopes[authorizerPath][method] = authorizer.scopes;
        }

        return this.getMethodAuthorizerProps(ApiAuthorizerType.custom, authorizerMethod);
      }
      case ApiAuthorizerType.cognito: {
        if (!this.authorizerIds[id]) {
          this.createCognitoAuthorizer(authorizerMetadata);
        }

        return this.getMethodAuthorizerProps(ApiAuthorizerType.cognito, authorizerMethod);
      }

      case ApiAuthorizerType.apiKey: {
        if (!this.authorizerIds[id]) {
          this.createApiKeyAuthorizer(authorizerMetadata);
        }

        return {
          authorization: 'NONE',
          apiKeyRequired: true,
        };
      }
      default: {
        throw new Error('authorizer type  not defined');
      }
    }
  }

  public assignStage(stage: ApiGatewayStage) {
    for (const usagePlan of this.usagePlans) {
      usagePlan.addOverride('api_stages', [
        {
          api_id: this.scope.id,
          stage: stage.stageName,
        },
      ]);
    }
  }

  get resources() {
    return this.authResources;
  }

  get permissions() {
    const permissions: AuthPermissions[] = [];

    for (const authMetadata in this.authorizerMetadata) {
      const auth = this.authorizerMetadata[authMetadata];
      if (auth.type === ApiAuthorizerType.custom && auth.pathScopes) {
        permissions.push({
          filename: auth.metadata.filename,
          foldername: auth.metadata.foldername,
          pathScopes: auth.pathScopes,
        });
      }
    }

    return permissions;
  }

  private getMethodAuthorizerProps(
    type: ApiAuthorizerType,
    authorizer: MethodAuthorizer
  ): Pick<
    ApiGatewayMethodConfig,
    'authorization' | 'authorizerId' | 'authorizationScopes'
  > {
    const isCustomAuthorizer = type === ApiAuthorizerType.custom;

    return {
      authorization: isCustomAuthorizer ? 'CUSTOM' : 'COGNITO_USER_POOLS',
      authorizerId: this.authorizerIds[authorizer.authorizerName as string],
      authorizationScopes:
        type === ApiAuthorizerType.cognito ? authorizer.scopes : undefined,
    };
  }

  private createCustomAuthorizer(
    id: string,
    { resource, metadata }: AuthorizerDataCustom
  ) {
    const handler = getMetadataPrototypeByKey<LambdaMetadata>(
      resource,
      AuthorizerReflectKeys.handler
    );

    if (!handler) {
      throw new Error('custom authorizer require a lambda handler');
    }

    lambdaAssets.initializeMetadata({
      className: metadata.originalName,
      filename: metadata.filename,
      foldername: metadata.foldername,
      minify: metadata.minify,
      methods: [handler.name],
      afterBuild: async (outputPath) => {
        const authorizer = this.authorizerMetadata[id] as AuthorizerDataCustom;

        if (!authorizer.pathScopes) {
          return;
        }

        const content = JSON.stringify(authorizer.pathScopes);
        await writeFile(join(outputPath, PERMISSION_DEFINITION_FILE), content);
      },
    });

    const lambdaHandler = new LambdaHandler(
      this.scope,
      `${metadata.name}-${resource.name}`,
      {
        ...handler,
        originalName: metadata.originalName,
        filename: metadata.filename,
        foldername: metadata.foldername,
        suffix: 'api-auth',
        principal: 'apigateway.amazonaws.com',
      }
    );

    const authorizer = new ApiGatewayAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.id,
      authorizerUri: lambdaHandler.invokeArn,
      type: 'REQUEST',
      identitySource: metadata.header
        ? `method.request.header.${metadata.header}`
        : undefined,
      authorizerResultTtlInSeconds: metadata.authorizerResultTtlInSeconds,
    });
    this.authResources.push(authorizer);
    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createCognitoAuthorizer({ metadata }: AuthorizerDataCognito) {
    const userPool = lafkenResource.getResource<CognitoUserPool>(
      'auth',
      metadata.userPool
    );

    if (!userPool) {
      throw new Error(`user pool ${metadata.userPool} not found`);
    }

    const authorizer = new ApiGatewayAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.id,
      type: 'COGNITO_USER_POOLS',
      providerArns: [userPool.arn],
      identitySource: metadata.header
        ? `method.request.header.${metadata.header}`
        : undefined,
      authorizerResultTtlInSeconds: metadata.authorizerResultTtlInSeconds,
    });

    this.authResources.push(authorizer);

    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createApiKeyAuthorizer({ metadata }: AuthorizerDataApiKey) {
    const usagePlan = new ApiGatewayUsagePlan(this.scope, `${metadata.name}-usage-plan`, {
      name: metadata.name,
      apiStages: [],
      quotaSettings: metadata.quota
        ? {
            limit: metadata.quota.limit,
            offset: metadata.quota.offset,
            period: metadata.quota.period.toUpperCase(),
          }
        : undefined,
      throttleSettings: metadata.throttle,
    });
    this.usagePlans.push(usagePlan);

    if (metadata.defaultKeys) {
      for (const key of metadata.defaultKeys) {
        const authKey = new ApiGatewayApiKey(this.scope, `${key}-key`, {
          name: key,
        });

        new ApiGatewayUsagePlanKey(this.scope, `${key}-usage-plan-key`, {
          keyId: authKey.id,
          keyType: 'API_KEY',
          usagePlanId: usagePlan.id,
        });
      }
    }

    this.authorizerIds[metadata.name] = usagePlan.id;
  }
}
