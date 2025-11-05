import { getResourceMetadata } from '@alicanto/common';
import { ContextName, Role } from '@alicanto/resolver';
import { Aspects } from 'cdktf';
import { Construct } from 'constructs';
import { AppAspect } from '../aspect/aspect';
import { AppContext } from '../context/context';
import type {
  CreateModuleProps,
  ModuleConstruct,
  ModuleProps,
  ModuleResolverType,
} from './module.types';

export class StackModule extends Construct {
  constructor(
    scope: Construct,
    public id: string,
    private props: ModuleProps
  ) {
    super(scope, id);
    new AppContext(this, {
      contextName: ContextName.module,
      globalConfig: props.globalConfig?.lambda,
      contextCreator: props.name,
    });
    this.createRole();
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

    this.addAspectProperties();
  }

  private createRole() {
    if (!this.props.globalConfig?.lambda?.services?.length) {
      return;
    }

    const roleName = `${this.props.name}-module-role`;

    const lambdaRole = new Role(this, roleName, {
      name: roleName,
      services: this.props.globalConfig?.lambda?.services || [],
    });

    lambdaRole.isGlobal('module');
  }

  private addAspectProperties() {
    Aspects.of(this).add(
      new AppAspect({
        tags: {
          ...(this.props.globalConfig?.tags || {}),
          'alicanto:module': this.props.name,
        },
      })
    );
  }
}

export const createModule =
  (props: CreateModuleProps) =>
  async (scope: ModuleConstruct, resolvers: Record<string, ModuleResolverType>) => {
    const module = new StackModule(scope, props.name, {
      ...props,
      resolvers,
    });

    await module.generateResources();

    return module;
  };
