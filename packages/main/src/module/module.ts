import { getResourceMetadata } from '@alicanto/common';
import { ContextName, type ResolverType } from '@alicanto/resolver';
import { Construct } from 'constructs';

import type { AppStack } from '../app/app';
import { AppContext } from '../context/context';
import type { CreateModuleProps, ModuleProps } from './module.types';

export class StackModule extends Construct {
  constructor(
    scope: AppStack,
    public id: string,
    private props: ModuleProps
  ) {
    super(scope, id);
    new AppContext(this, {
      contextName: ContextName.APP,
      globalConfig: props.globalConfig,
    });
  }

  async generateResources() {
    const { resources } = this.props;

    for (const resource of resources) {
      const metadata = getResourceMetadata(resource);
      const resolver = this.props.resolvers[metadata.type];

      if (!resolver) {
        throw new Error(`There is no resolver for the resource ${metadata.type}`);
      }

      await resolver.create(this, resource);
    }
  }
}

export const createModule =
  (props: CreateModuleProps) =>
  async (scope: AppStack, resolvers: Record<string, ResolverType>) => {
    const module = new StackModule(scope, props.name, {
      ...props,
      resolvers,
    });

    await module.generateResources();

    return module;
  };
