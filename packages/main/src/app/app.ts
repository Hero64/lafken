import { AwsProvider } from '@cdktn/provider-aws/lib/provider';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  ContextName,
  lambdaAssets,
  type ResolverType,
  Role,
  rootScope,
} from '@lafken/resolver';
import { App, Aspects, LocalBackend, S3Backend, TerraformStack } from 'cdktn';
import { AppAspect } from '../aspect/aspect';
import { AppContext } from '../context/context';
import type { CreateAppProps } from './app.types';

enableBuildEnvVariable();

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
      bundler: props.globalConfig?.bundler,
    });
    new AwsProvider(this, 'AWS', props.awsProviderConfig);

    this.createStateBackend();
    this.createRole();
  }

  async init() {
    const { resolvers, extend } = this.props;

    await this.triggerHook(resolvers, 'beforeCreate');
    await this.resolveModuleResources();
    await this.triggerHook(resolvers, 'afterCreate');

    if (extend) {
      await extend(this);
    }

    this.addAspectProperties();
    await lambdaAssets.createAssets();
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

    await Promise.all(
      modules.map((module) =>
        module(this, resolversByType, this.props.globalConfig?.lambda?.services)
      )
    );
  }

  private createStateBackend() {
    const { state } = this.props;

    if (!state) {
      return;
    }

    if (state.type === 'local') {
      const { type, ...config } = state;
      new LocalBackend(this, config);
      return;
    }

    const { type, ...config } = state;
    new S3Backend(this, config);
  }

  private createRole() {
    const services = this.props.globalConfig?.lambda?.services;
    if (Array.isArray(services) && !services.length) {
      return;
    }

    const roleName = `${this.props.name}-global-role`;

    const lambdaRole = new Role(this, roleName, {
      name: roleName,
      services: services || [
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

    lambdaRole.register('app', roleName);
  }

  private addAspectProperties() {
    Aspects.of(this).add(
      new AppAspect(this, 'app', {
        tags: {
          ...(this.props.globalConfig?.tags || {}),
          'lafken:app': this.id,
        },
        environment: this.props.globalConfig?.lambda?.env,
        vpc: this.props.globalConfig?.lambda?.vpcConfig,
      })
    );
  }
}

/**
 * Creates and synthesizes a Lafken serverless application.
 *
 * Initializes the CDKTN application, sets up the AWS stack with the
 * provided modules and resolvers, executes the full resolver lifecycle
 * (beforeCreate → create → afterCreate), and synthesizes the resulting
 * Terraform configuration.
 *
 * @param props - The application configuration including name, modules,
 * resolvers, global settings, and optional extensions.
 * @returns The CDKTN `App` instance and the `AppStack` created for the application.
 *
 * @example
 * await createApp({
 *   name: 'my-app',
 *   modules: [
 *     //... ,
 *   ],
 *   resolvers: [new ApiResolver({ restApi: { name: 'my-api' } })],
 *   globalConfig: {
 *     lambda: { runtime: 22, memory: 512 },
 *     tags: { environment: 'production' },
 *   },
 * });
 */
export const createApp = async (props: CreateAppProps) => {
  const app = new App({
    skipValidation: true,
  });
  const appStack = new AppStack(app, props.name, props);
  rootScope.set(appStack);
  await appStack.init();

  app.synth();

  return {
    app,
    appStack,
  };
};
