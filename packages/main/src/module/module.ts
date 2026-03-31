import { getResourceMetadata } from '@lafken/common';
import { ContextName, Role } from '@lafken/resolver';
import { Aspects } from 'cdktn';
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

    lambdaRole.isGlobal('module', roleName);
  }

  private addAspectProperties() {
    Aspects.of(this).add(
      new AppAspect(this, this.props.name, {
        tags: {
          ...(this.props.globalConfig?.tags || {}),
          'lafken:module': this.props.name,
        },
        environment: this.props.globalConfig?.lambda?.env,
        vpc: this.props.globalConfig?.lambda?.vpcConfig,
      })
    );
  }
}

/**
 * Creates a module factory for the Lafken application.
 *
 * Returns a function that, when invoked by `createApp`, instantiates a
 * `StackModule` and processes all its declared resources through the
 * registered resolvers. Each module groups related resources into a
 * logical unit with its own scope, IAM role, tags, and optional
 * Lambda configuration.
 *
 * @param props - The module configuration including name, resources, and
 * optional global settings scoped to this module.
 * @returns A factory function consumed by `createApp` to build the module
 * within the application stack.
 *
 * @example
 * createModule({
 *   name: 'users',
 *   resources: [UserApi, UserQueue],
 *   globalConfig: {
 *     lambda: { memory: 256, services: ['dynamodb'] },
 *     tags: { team: 'backend' },
 *   },
 * })
 */
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
