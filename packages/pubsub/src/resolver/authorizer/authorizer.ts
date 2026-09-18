import type { AppsyncApiEventConfigAuthProvider } from '@cdktn/provider-aws/lib/appsync-api';
import { AppsyncApiKey } from '@cdktn/provider-aws/lib/appsync-api-key';
import {
  type ClassResource,
  getMetadataPrototypeByKey,
  getResourceMetadata,
  type LambdaMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  getExternalValues,
  initLambdaAssetMetadata,
  LambdaHandler,
  resolveCallbackResource,
} from '@lafken/resolver';
import {
  type ApiKeyAuthorizerMetadata,
  AuthorizerReflectKeys,
  ChannelAuthorizerType,
  type CognitoAuthorizerMetadata,
  type LambdaAuthorizerMetadata,
} from '../../main';
import type { EventApi } from '../event-api';
import type { AuthorizerFactoryProps } from './authorizer.types';

export class AuthorizerFactory {
  public readonly authProviders: AppsyncApiEventConfigAuthProvider[] = [];
  public readonly defaultAuthorizerName?: string;
  private authTypeByName: Record<string, string> = {};
  private hasLambdaAuthorizer = false;

  constructor(
    private scope: EventApi,
    props: AuthorizerFactoryProps
  ) {
    this.defaultAuthorizerName = props.defaultAuthorizerName;

    for (const resource of props.authorizers) {
      const metadata = getResourceMetadata<any>(resource);

      switch (metadata.type as ChannelAuthorizerType) {
        case ChannelAuthorizerType.apiKey:
          this.createApiKeyAuthorizer(metadata);
          break;
        case ChannelAuthorizerType.cognito:
          this.createCognitoAuthorizer(metadata);
          break;
        case ChannelAuthorizerType.lambda:
          this.createLambdaAuthorizer(resource, metadata);
          break;
        case ChannelAuthorizerType.iam:
          this.createIamAuthorizer(metadata);
          break;
        default:
          throw new Error(`unsupported channel authorizer type: ${metadata.type}`);
      }
    }

    if (this.authProviders.length === 0) {
      this.createApiKeyAuthorizer({ name: 'default' } as ApiKeyAuthorizerMetadata);
    }

    if (this.defaultAuthorizerName) {
      this.getAuthType(this.defaultAuthorizerName);
    }
  }

  public getAuthType(authorizerName: string) {
    const authType = this.authTypeByName[authorizerName];

    if (!authType) {
      throw new Error(`channel authorizer "${authorizerName}" not found`);
    }

    return authType;
  }

  private createIamAuthorizer(metadata: ResourceMetadata) {
    this.authProviders.push({ authType: 'AWS_IAM' });
    this.authTypeByName[metadata.name] = 'AWS_IAM';
  }

  private createApiKeyAuthorizer(metadata: ApiKeyAuthorizerMetadata) {
    this.authProviders.push({ authType: 'API_KEY' });
    this.authTypeByName[metadata.name] = 'API_KEY';

    new AppsyncApiKey(this.scope, `${metadata.name}-key`, {
      apiId: this.scope.apiId,
      description: metadata.description,
      expires: metadata.expires,
    });
  }

  private createCognitoAuthorizer(metadata: CognitoAuthorizerMetadata) {
    const index = this.authProviders.length;
    this.authTypeByName[metadata.name] = 'AMAZON_COGNITO_USER_POOLS';

    const userPoolId = resolveCallbackResource(this.scope, metadata.userPoolId);
    const { region } = getExternalValues(this.scope);

    this.authProviders.push({
      authType: 'AMAZON_COGNITO_USER_POOLS',
      cognitoConfig: [{ awsRegion: region, userPoolId: userPoolId || '' }],
    });

    if (!userPoolId) {
      this.scope.onResolve(() => {
        const resolvedUserPoolId = resolveCallbackResource(
          this.scope,
          metadata.userPoolId
        );

        if (!resolvedUserPoolId) {
          throw new Error(`userPoolId not found for channel authorizer ${metadata.name}`);
        }

        this.scope.addOverride(
          `event_config.0.auth_provider.${index}.cognito_config.0.user_pool_id`,
          resolvedUserPoolId
        );
      });
    }
  }

  private createLambdaAuthorizer(
    resource: ClassResource,
    metadata: LambdaAuthorizerMetadata
  ) {
    if (this.hasLambdaAuthorizer) {
      throw new Error('an AppSync Event API supports only one AWS_LAMBDA authorizer');
    }
    this.hasLambdaAuthorizer = true;

    const handler = getMetadataPrototypeByKey<LambdaMetadata>(
      resource,
      AuthorizerReflectKeys.handler
    );

    if (!handler) {
      throw new Error(
        'a channel lambda authorizer requires an @AuthorizerHandler method'
      );
    }

    initLambdaAssetMetadata({ metadata, handlers: [handler] });

    const lambdaHandler = new LambdaHandler(
      this.scope,
      `${metadata.name}-${resource.name}`,
      {
        ...handler,
        originalName: metadata.originalName,
        filename: metadata.filename,
        foldername: metadata.foldername,
        suffix: 'channel-auth',
        principal: 'appsync.amazonaws.com',
      }
    );

    this.authTypeByName[metadata.name] = 'AWS_LAMBDA';
    this.authProviders.push({
      authType: 'AWS_LAMBDA',
      lambdaAuthorizerConfig: [
        {
          // AppSync's AWS_LAMBDA authorizer requires the Lambda function
          // ARN itself, not the API Gateway-style invoke ARN — passing
          // `invokeArn` fails with "Lambda Authorizer URI must be a valid
          // Lambda function ARN" on `UpdateApi`.
          authorizerUri: lambdaHandler.arn,
          authorizerResultTtlInSeconds: metadata.authorizerResultTtlInSeconds,
        },
      ],
    });
  }
}
