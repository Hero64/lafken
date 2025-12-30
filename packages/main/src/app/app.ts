import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  ContextName,
  lafkenResource,
  lambdaAssets,
  type ResolverType,
  Role,
} from '@lafken/resolver';
import { App, Aspects, TerraformStack } from 'cdktf';
import PrettyError from 'pretty-error';
import { AppAspect } from '../aspect/aspect';
import { AppContext } from '../context/context';
import type { CreateAppProps } from './app.types';

enableBuildEnvVariable();
new PrettyError().start();

export class AppStack extends TerraformStack {
  constructor(
    scope: App,
    public id: string,
    private props: CreateAppProps
  ) {
    super(scope, id);

    new AppContext(this, {
      contextName: ContextName.app,
      globalConfig: props.globalConfig?.lambda,
      contextCreator: props.name,
    });
    new AwsProvider(this, 'AWS', props.awsProviderConfig);

    this.createRole();
  }

  async init() {
    const { resolvers, extend } = this.props;

    await this.triggerHook(resolvers, 'beforeCreate');
    await this.resolveModuleResources();
    await this.triggerHook(resolvers, 'afterCreate');

    this.addAspectProperties();
    await lafkenResource.callDependentCallbacks();
    await lambdaAssets.createAssets();
    if (extend) {
      await extend(this);
    }
  }

  private async triggerHook(
    resolvers: ResolverType[],
    trigger: 'beforeCreate' | 'afterCreate'
  ) {
    for (const resolver of resolvers) {
      if (resolver[trigger] !== undefined) {
        await resolver[trigger](this);
      }
    }
  }

  private async resolveModuleResources() {
    const { modules, resolvers } = this.props;
    const resolversByType = resolvers.reduce(
      (acc, resolver) => {
        acc[resolver.type] = resolver;
        return acc;
      },
      {} as Record<string, ResolverType>
    );

    await Promise.all(modules.map((module) => module(this, resolversByType)));
  }

  private createRole() {
    const roleName = `${this.props.name}-global-role`;

    const lambdaRole = new Role(this, roleName, {
      name: roleName,
      services: this.props.globalConfig?.lambda?.services || [
        'dynamodb',
        's3',
        'lambda',
        'cloudwatch',
        'sqs',
        'state_machine',
        'kms',
        'ssm',
        'event',
      ],
    });

    lambdaRole.isGlobal('app', roleName);
  }

  private addAspectProperties() {
    Aspects.of(this).add(
      new AppAspect({
        tags: {
          ...(this.props.globalConfig?.tags || {}),
          'lafken:app': this.id,
        },
      })
    );
  }
}

export const createApp = async (props: CreateAppProps) => {
  const app = new App({
    skipValidation: true,
  });
  const appStack = new AppStack(app, props.name, props);
  await appStack.init();

  app.synth();

  return {
    app,
    appStack,
  };
};
