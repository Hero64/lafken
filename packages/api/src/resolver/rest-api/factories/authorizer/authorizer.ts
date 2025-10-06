import {
  type ClassResource,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
} from '@alicanto/common';
import { alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { ApiGatewayAuthorizer } from '@cdktf/provider-aws/lib/api-gateway-authorizer';
import type { ApiGatewayMethodConfig } from '@cdktf/provider-aws/lib/api-gateway-method';
import { ApiGatewayUsagePlan } from '@cdktf/provider-aws/lib/api-gateway-usage-plan';
import { ApiGatewayUsagePlanKey } from '@cdktf/provider-aws/lib/api-gateway-usage-plan-key';
import type { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';
import {
  ApiAuthorizerType,
  AuthorizerReflectKeys,
  type MethodAuthorizer,
} from '../../../../main';
import type { RestApi } from '../../rest-api';
import type {
  AuthorizerData,
  AuthorizerDataApiKey,
  AuthorizerDataCognito,
  AuthorizerDataCustom,
} from './authorizer.types';

export class AuthorizerFactory {
  private authorizerIds: Record<string, string> = {};
  private authorizerMetadata: Record<string, AuthorizerData> = {};
  constructor(
    private scope: RestApi,
    authorizerResources: ClassResource[]
  ) {
    for (const resource of authorizerResources) {
      const metadata = getResourceMetadata<any>(resource);
      this.authorizerMetadata[metadata.name] = {
        resource,
        metadata,
        type: metadata.type as ApiAuthorizerType,
      };
    }
  }

  public async getAuthorizerProps(authorizer?: MethodAuthorizer | false) {
    if (!authorizer) {
      return {
        authorization: 'NONE',
      };
    }

    const id = authorizer.authorizerName as string;

    const authorizerMetadata = this.authorizerMetadata[id];
    if (!authorizerMetadata) {
      throw new Error(`authorized ${id} not found`);
    }

    switch (authorizerMetadata.type) {
      case ApiAuthorizerType.custom: {
        if (!this.authorizerIds[id]) {
          await this.createCustomAuthorizer(authorizerMetadata);
        }

        return this.getMethodAuthorizerProps(ApiAuthorizerType.custom, authorizer);
      }
      case ApiAuthorizerType.cognito: {
        if (!this.authorizerIds[id]) {
          await this.createCognitoAuthorizer(authorizerMetadata);
        }

        return this.getMethodAuthorizerProps(ApiAuthorizerType.cognito, authorizer);
      }

      case ApiAuthorizerType.apiKey: {
        if (!this.authorizerIds[id]) {
          await this.createApiKeyAuthorizer(authorizerMetadata);
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

  private getMethodAuthorizerProps(
    type: ApiAuthorizerType,
    authorizer: MethodAuthorizer
  ): Pick<
    ApiGatewayMethodConfig,
    'authorization' | 'authorizerId' | 'authorizationScopes'
  > {
    return {
      authorization: type === ApiAuthorizerType.custom ? 'CUSTOM' : 'COGNITO_USER_POOLS',
      authorizerId: this.authorizerIds[authorizer.authorizerName as string],
      authorizationScopes: type === ApiAuthorizerType.cognito ? [] : undefined,
    };
  }

  private async createCustomAuthorizer({ resource, metadata }: AuthorizerDataCustom) {
    const handler = getMetadataPrototypeByKey<LambdaMetadata>(
      resource,
      AuthorizerReflectKeys.HANDLER
    );

    const lambdaHandler = new LambdaHandler(
      this.scope,
      `${metadata.name}-${resource.name}`,
      {
        ...handler,
        filename: metadata.filename,
        pathName: metadata.foldername,
        suffix: 'auth',
        principal: 'apigateway.amazonaws.com',
      }
    );

    const lambda = await lambdaHandler.generate();
    /**
     * This is token type
     */
    const authorizer = new ApiGatewayAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.api.id,
      authorizerCredentials: undefined, // TODO: ver si necesito cambiar esto,
      authorizerUri: lambda.arn,
      identitySource: metadata.header
        ? `method.request.header.${metadata.header}`
        : undefined,
    });

    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createCognitoAuthorizer({ metadata }: AuthorizerDataCognito) {
    const userPool = alicantoResource.getResource<CognitoUserPool>(
      `auth_${metadata.userPool}`
    );

    if (!userPool) {
      throw new Error(`user pool ${metadata.userPool} not found`);
    }

    const authorizer = new ApiGatewayAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.api.id,
      type: 'COGNITO_USER_POOLS',
      providerArns: [userPool.arn],
      identitySource: metadata.header
        ? `method.request.header.${metadata.header}`
        : undefined,
    });

    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createApiKeyAuthorizer({ metadata }: AuthorizerDataApiKey) {
    const usagePlan = new ApiGatewayUsagePlan(this.scope, `${metadata.name}-usage-plan`, {
      name: metadata.name,
      apiStages: [
        {
          apiId: this.scope.api.id,
          stage: this.scope.stage.stageName,
        },
      ],
      quotaSettings: metadata.quota
        ? {
            limit: metadata.quota.limit,
            offset: metadata.quota.offset,
            period: metadata.quota.period.toUpperCase(),
          }
        : undefined,
      throttleSettings: metadata.throttle,
    });

    if (metadata.defaultKeys) {
      for (const key of metadata.defaultKeys) {
        new ApiGatewayUsagePlanKey(this.scope, key, {
          keyId: key,
          keyType: 'API_KEY',
          usagePlanId: usagePlan.id,
        });
      }
    }

    this.authorizerIds[metadata.name] = usagePlan.id;
  }
}
