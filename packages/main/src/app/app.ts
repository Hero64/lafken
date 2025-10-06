import { ContextName, type ResolverType } from '@alicanto/resolver';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { App, TerraformStack } from 'cdktf';

import { AppContext } from '../context/context';
import type { CreateAppProps } from './app.types';

export class AppStack extends TerraformStack {
  constructor(
    scope: App,
    public id: string,
    private props: CreateAppProps
  ) {
    super(scope, id);

    new AppContext(this, {
      contextName: ContextName.APP,
      globalConfig: props.globalConfig,
    });
    new AwsProvider(scope, 'AWS');
  }

  async init() {
    const { resolvers } = this.props;

    await this.triggerHook(resolvers, 'beforeCreate');
    await this.resolveModuleResources();
    await this.triggerHook(resolvers, 'afterCreate');
    // TODO: crear un aspect que resuelva
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
}

export const createApp = async (props: CreateAppProps) => {
  const app = new App();
  const appStack = new AppStack(app, props.name, props);
  await appStack.init();

  return {
    app,
    appStack,
  };
};
