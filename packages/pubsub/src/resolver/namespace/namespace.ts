import { AppsyncChannelNamespace } from '@cdktn/provider-aws/lib/appsync-channel-namespace';
import { AppsyncDatasource } from '@cdktn/provider-aws/lib/appsync-datasource';
import { LambdaHandler, lafkenResource, Role } from '@lafken/resolver';
import { dependable } from 'cdktn';
import { type ChannelLambdaMetadata, ChannelOperation } from '../../main';
import type { EventApi } from '../event-api';
import type { NamespaceProps } from './namespace.types';
import { buildAuthMode, sanitizeName } from './namespace.utils';

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
      publishAuthMode: buildAuthMode(
        scope.authorizerFactory,
        resourceMetadata.publishAuth ?? resourceMetadata.auth
      ),
      subscribeAuthMode: buildAuthMode(
        scope.authorizerFactory,
        resourceMetadata.subscribeAuth ?? resourceMetadata.auth
      ),
    });

    if (onPublish || onSubscribe) {
      this.putHandlerConfigs([
        {
          onPublish: this.buildOperationHandler(onPublish, publishDataSourceName),
          onSubscribe: this.buildOperationHandler(onSubscribe, subscribeDataSourceName),
        },
      ]);
    }

    if (onPublish) {
      this.createHandlerDataSource(publishDataSourceName, props, onPublish);
    }
    if (onSubscribe) {
      this.createHandlerDataSource(subscribeDataSourceName, props, onSubscribe);
    }
  }

  private buildOperationHandler(
    handler: ChannelLambdaMetadata | undefined,
    dataSourceName: string
  ) {
    if (!handler) {
      return undefined;
    }

    return [
      {
        behavior: 'DIRECT',
        integration: [
          {
            dataSourceName,
            lambdaConfig: [{ invokeType: 'REQUEST_RESPONSE' }],
          },
        ],
      },
    ];
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

    const datasource = new AppsyncDatasource(this, `${dataSourceName}-datasource`, {
      apiId: this.scope.apiId,
      name: dataSourceName,
      type: 'AWS_LAMBDA',
      serviceRoleArn: role.arn,
      lambdaConfig: { functionArn: lambdaHandler.arn },
      dependsOn: [role, role.policy],
    });

    // The channel namespace only references the data source by name (a
    // plain string), so Terraform can't infer the dependency on its own —
    // without this, AppSync may try to create the namespace before its
    // data source exists and fail with "DataSource not found".
    this.dependsOn = [...(this.dependsOn ?? []), dependable(datasource)];
  }
}
