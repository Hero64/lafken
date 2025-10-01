import { getResourceMetadata } from '@alicanto/common';
import type { ResolverType } from '@alicanto/resolver';

import type { AppStack } from '../app/app';
import { StackConfig } from '../config/config';
import type { CreateModuleProps } from './module.types';

export class StackModule {
  public config: StackConfig;
  constructor(
    public readonly app: AppStack,
    public readonly name: string,
    private resolvers: Record<string, ResolverType>,
    private props: CreateModuleProps
  ) {
    this.config = new StackConfig(
      app,
      {
        name,
        globalConfig: props.globalConfig,
      },
      false
    );
  }

  async generateResources() {
    const { resources } = this.props;

    for (const resource of resources) {
      const metadata = getResourceMetadata(resource);
      const resolver = this.resolvers[metadata.type];

      if (!resolver) {
        throw new Error(`There is no resolver for the resource ${metadata.type}`);
      }

      await resolver.create(this, resource);
    }
  }
}

export const createModule =
  (props: CreateModuleProps) =>
  async (scope: AppStack, resources: Record<string, ResolverType>) => {
    const module = new StackModule(scope, props.name, resources, props);

    await module.generateResources();

    return module;
  };
