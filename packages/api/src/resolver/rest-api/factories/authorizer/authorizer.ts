import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiGatewayApiKey } from '@cdktn/provider-aws/lib/api-gateway-api-key';
import { ApiGatewayAuthorizer } from '@cdktn/provider-aws/lib/api-gateway-authorizer';
import type { ApiGatewayMethodConfig } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayUsagePlan } from '@cdktn/provider-aws/lib/api-gateway-usage-plan';
import { ApiGatewayUsagePlanKey } from '@cdktn/provider-aws/lib/api-gateway-usage-plan-key';

import {
  type BundlerConfig,
  type ClassResource,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
} from '@lafken/common';
import {
  getContextValueByScope,
  initLambdaAssetMetadata,
  LambdaHandler,
  lafkenResource,
  resolveCallbackResource,
} from '@lafken/resolver';
import type { TerraformResource } from 'cdktn';
import {
  ApiAuthorizerType,
  AuthorizerReflectKeys,
  type MethodAuthorizer,
  PERMISSION_DEFINITION_FILE,
} from '../../../../main';
import type { RestApi } from '../../../resolver.types';
import type { SecuritySchemeObject, XAmazonAuthorizer } from '../openapi/openapi.types';
import type {
  AuthorizerData,
  AuthorizerDataApiKey,
  AuthorizerDataCognito,
  AuthorizerDataCustom,
  AuthorizerFactoryProps,
  AuthPermissions,
  GetAuthorizerProps,
} from './authorizer.types';

const API_KEY_SCHEME = 'api_key';

const LafkenAuthorizer = lafkenResource.make(ApiGatewayAuthorizer);

export class AuthorizerFactory {
  private authorizerIds: Record<string, string> = {};
  private authorizerMetadata: Record<string, AuthorizerData> = {};
  private authResources: TerraformResource[] = [];
  private defaultAuthorizer?: MethodAuthorizer;
  private usagePlans: ApiGatewayUsagePlan[] = [];
  private globalBundler: BundlerConfig | undefined = undefined;

  constructor(
    private scope: RestApi,
    authorizerResources: ClassResource[],
    private props: AuthorizerFactoryProps
  ) {
    this.globalBundler = getContextValueByScope(scope, 'bundler');
    const { defaultAuthorizer } = props;

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

  private get isOpenApi() {
    return this.scope.openapiFactory.isEnabled;
  }

  /**
   * Openapi-mode counterpart of {@link getAuthorizerProps}: ensures the
   * authorizer is registered as a `securityScheme` (creating any real side
   * resources such as the custom-authorizer lambda) and returns the operation
   * `security` requirement.
   */
  public getOperationSecurity(
    props: GetAuthorizerProps
  ): Array<Record<string, string[]>> | undefined {
    const { authorizer, fullPath, method } = props;
    if (
      authorizer === false ||
      (!authorizer?.authorizerName && !this.defaultAuthorizer)
    ) {
      return undefined;
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
          this.createCustomAuthorizer(id, authorizerMetadata as AuthorizerDataCustom);
        }
        const customAuthorizerMetadata = authorizerMetadata as AuthorizerDataCustom;
        const authorizerPath = fullPath?.[0] === '/' ? fullPath : `/${fullPath}`;
        if (authorizer?.scopes?.length) {
          customAuthorizerMetadata.pathScopes ??= {};
          customAuthorizerMetadata.pathScopes[authorizerPath] ??= {};
          customAuthorizerMetadata.pathScopes[authorizerPath][method] = authorizer.scopes;
        }
        return [{ [id]: authorizerMethod.scopes ?? [] }];
      }
      case ApiAuthorizerType.cognito: {
        if (!this.authorizerIds[id]) {
          this.createCognitoAuthorizer(authorizerMetadata as AuthorizerDataCognito);
        }
        return [{ [id]: authorizerMethod.scopes ?? [] }];
      }
      case ApiAuthorizerType.apiKey: {
        if (!this.authorizerIds[id]) {
          this.createApiKeyAuthorizer(authorizerMetadata as AuthorizerDataApiKey);
        }
        return [{ [API_KEY_SCHEME]: [] }];
      }
      default: {
        throw new Error('authorizer type  not defined');
      }
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

    initLambdaAssetMetadata({
      metadata,
      handlers: [handler],
      contextBundler: this.globalBundler,
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
        sourceArn: `${this.scope.executionArn}/authorizers/*`,
      }
    );

    const identitySource = metadata.header
      ? `method.request.header.${metadata.header}`
      : undefined;

    if (this.isOpenApi) {
      this.scope.openapiFactory.addSecurityScheme(metadata.name, {
        type: 'apiKey',
        name: metadata.header || 'Authorization',
        in: 'header',
        'x-amazon-apigateway-authtype': 'custom',
        'x-amazon-apigateway-authorizer': {
          type: 'request',
          authorizerUri: lambdaHandler.invokeArn,
          identitySource,
          // API Gateway's OpenAPI import rejects a REQUEST authorizer whose
          // result cache is enabled (TTL > 0, the default is 300) without an
          // identity source. When there is no identity source, disable caching
          // so the import succeeds and the lambda is always invoked.
          authorizerResultTtlInSeconds: identitySource
            ? metadata.authorizerResultTtlInSeconds
            : 0,
        },
      });
      this.authorizerIds[metadata.name] = metadata.name;
      return;
    }

    const authorizer = new ApiGatewayAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.id,
      authorizerUri: lambdaHandler.invokeArn,
      type: 'REQUEST',
      identitySource,
      authorizerResultTtlInSeconds: metadata.authorizerResultTtlInSeconds,
      dependsOn: [lambdaHandler],
    });

    this.createDoc(metadata.name, metadata.description);

    this.authResources.push(authorizer);
    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createCognitoAuthorizer({ metadata }: AuthorizerDataCognito) {
    if (this.isOpenApi) {
      const xAuthorizer: XAmazonAuthorizer = {
        type: 'cognito_user_pools',
        providerARNs: [],
      };
      const scheme: SecuritySchemeObject = {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        'x-amazon-apigateway-authtype': 'cognito_user_pools',
        'x-amazon-apigateway-authorizer': xAuthorizer,
      };
      this.scope.openapiFactory.addSecurityScheme(metadata.name, scheme);

      const userPoolArn = resolveCallbackResource(this.scope, metadata.userPoolArn);
      if (userPoolArn) {
        xAuthorizer.providerARNs = [userPoolArn];
      } else {
        this.scope.openapiFactory.addDeferred(() => {
          const resolvedArn = resolveCallbackResource(this.scope, metadata.userPoolArn);
          if (!resolvedArn) {
            throw new Error('userPoolArn not found, please check user pool ref');
          }
          xAuthorizer.providerARNs = [resolvedArn];
        });
      }

      this.authorizerIds[metadata.name] = metadata.name;
      return;
    }

    const authorizer = new LafkenAuthorizer(this.scope, `${metadata.name}-auth`, {
      name: metadata.name,
      restApiId: this.scope.id,
      type: 'COGNITO_USER_POOLS',
      identitySource: metadata.header
        ? `method.request.header.${metadata.header}`
        : undefined,
      authorizerResultTtlInSeconds: metadata.authorizerResultTtlInSeconds,
    });

    const userPoolArn = resolveCallbackResource(this.scope, metadata.userPoolArn);

    if (userPoolArn) {
      authorizer.providerArns = [userPoolArn];
    } else {
      authorizer.onResolve(() => {
        const userPoolArn = resolveCallbackResource(this.scope, metadata.userPoolArn);

        if (!userPoolArn) {
          throw new Error('userPoolArn not found, please check user pool ref');
        }

        authorizer.providerArns = [userPoolArn];
      });
    }

    this.authResources.push(authorizer);
    this.createDoc(metadata.name, metadata.description);
    this.authorizerIds[metadata.name] = authorizer.id;
  }

  private createApiKeyAuthorizer({ metadata }: AuthorizerDataApiKey) {
    if (this.isOpenApi) {
      this.scope.openapiFactory.addSecurityScheme(API_KEY_SCHEME, {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      });
    }

    const { createUsagePlan = true } = metadata;

    if (!createUsagePlan) {
      this.authorizerIds[metadata.name] = '';
    }

    const usagePlan = new ApiGatewayUsagePlan(this.scope, `${metadata.name}-usage-plan`, {
      name: metadata.name,
      apiStages: this.props.stageNames.map((stageName) => ({
        apiId: this.scope.id,
        stage: stageName,
      })),
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
          dependsOn: [this.scope],
        });

        new ApiGatewayUsagePlanKey(this.scope, `${key}-usage-plan-key`, {
          keyId: authKey.id,
          keyType: 'API_KEY',
          usagePlanId: usagePlan.id,
          dependsOn: [authKey],
        });
      }
    }

    this.authorizerIds[metadata.name] = usagePlan.id;
  }

  private createDoc(name: string, description?: string) {
    if (!description) {
      return;
    }
    this.scope.docsFactory.createDoc({
      id: '',
      location: {
        type: 'AUTHORIZER',
        name,
      },
      properties: {
        description,
      },
    });
  }
}
