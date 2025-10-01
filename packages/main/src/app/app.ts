import { type ResolverType, removeExportedFiles } from '@alicanto/resolver';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { App, TerraformStack } from 'cdktf';

import { StackConfig } from '../config/config';
import type { CreateAppProps } from './app.types';

export class AppStack extends TerraformStack {
  public config: StackConfig;
  constructor(
    scope: App,
    public readonly name: string,
    private props: CreateAppProps
  ) {
    super(scope, name);
    this.config = new StackConfig(this, props);
    new AwsProvider(scope, 'AWS');
  }

  async init() {
    const { resolvers } = this.props;

    await this.triggerHook(resolvers, 'beforeCreate');
    await this.resolveModuleResources();
    // TODO: posterior al create de recursos verificar dependencias no resueltas
    await this.triggerHook(resolvers, 'afterCreate');
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
  try {
    const app = new App();
    const appStack = new AppStack(app, props.name, props);
    await appStack.init();

    return {
      app,
      appStack,
    };
  } finally {
    await removeExportedFiles();
  }
};
