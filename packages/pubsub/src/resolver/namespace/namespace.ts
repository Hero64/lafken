import { AppsyncChannelNamespace } from '@cdktn/provider-aws/lib/appsync-channel-namespace';
import { AppsyncDatasource } from '@cdktn/provider-aws/lib/appsync-datasource';
import { LambdaHandler, lafkenResource, Role } from '@lafken/resolver';
import {
  type ChannelAuthorizer,
  type ChannelLambdaMetadata,
  ChannelOperation,
} from '../../main';
import type { AuthorizerFactory } from '../authorizer/authorizer';
import type { EventApi } from '../event-api/event-api';
import type { NamespaceProps } from './namespace.types';

const sanitizeName = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_');

const buildAuthMode = (
  authorizerFactory: AuthorizerFactory,
  auth?: ChannelAuthorizer | false
) => {
  if (!auth) {
    return undefined;
  }

  return [{ authType: authorizerFactory.getAuthType(auth.authorizerName) }];
};

export class Namespace extends lafkenResource.make(AppsyncChannelNamespace) {
  constructor(
    private scope: EventApi,
    id: string,
    props: NamespaceProps
  ) {
    const { resourceMetadata, handlers } = props;
    const name = resourceMetadata.namespace || resourceMetadata.name;

    const onPublish = handlers.find(
      (handler) => handler.operation === ChannelOperation.publish
    );
    const onSubscribe = handlers.find(
      (handler) => handler.operation === ChannelOperation.subscribe
    );

    const publishDataSourceName = sanitizeName(`${name}_publish`);
    const subscribeDataSourceName = sanitizeName(`${name}_subscribe`);

    super(scope, id, {
      apiId: scope.apiId,
      name,
      handlerConfigs:
        onPublish || onSubscribe
          ? [
              {
                onPublish: onPublish
                  ? [
                      {
                        behavior: 'DIRECT',
                        integration: [
                          {
                            dataSourceName: publishDataSourceName,
                            lambdaConfig: [{ invokeType: 'REQUEST_RESPONSE' }],
                          },
                        ],
                      },
                    ]
                  : undefined,
                onSubscribe: onSubscribe
                  ? [
                      {
                        behavior: 'DIRECT',
                        integration: [
                          {
                            dataSourceName: subscribeDataSourceName,
                            lambdaConfig: [{ invokeType: 'REQUEST_RESPONSE' }],
                          },
                        ],
                      },
                    ]
                  : undefined,
              },
            ]
          : undefined,
      publishAuthMode: buildAuthMode(
        scope.authorizerFactory,
        resourceMetadata.publishAuth ?? resourceMetadata.auth
      ),
      subscribeAuthMode: buildAuthMode(
        scope.authorizerFactory,
        resourceMetadata.subscribeAuth ?? resourceMetadata.auth
      ),
    });

    if (onPublish) {
      this.createHandlerDataSource(publishDataSourceName, props, onPublish);
    }
    if (onSubscribe) {
      this.createHandlerDataSource(subscribeDataSourceName, props, onSubscribe);
    }
  }

  private createHandlerDataSource(
    dataSourceName: string,
    { resourceMetadata }: NamespaceProps,
    handler: ChannelLambdaMetadata
  ) {
    const lambdaHandler = new LambdaHandler(this, `${dataSourceName}-lambda`, {
      ...handler,
      originalName: resourceMetadata.originalName,
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      suffix: `channel-${handler.operation}`,
    });

    const role = new Role(this, `${dataSourceName}-role`, {
      name: `${dataSourceName}-role`,
      principal: 'appsync.amazonaws.com',
      services: [
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: [lambdaHandler.arn],
        },
      ],
    });

    new AppsyncDatasource(this, `${dataSourceName}-datasource`, {
      apiId: this.scope.apiId,
      name: dataSourceName,
      type: 'AWS_LAMBDA',
      serviceRoleArn: role.arn,
      lambdaConfig: { functionArn: lambdaHandler.arn },
      dependsOn: [role, role.policy],
    });
  }
}
