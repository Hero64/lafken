import { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import { LambdaPermission } from '@cdktf/provider-aws/lib/lambda-permission';
import type { Construct } from 'constructs';
import { ContextName, type GlobalContext } from '../../types';
import { Environment } from '../environment/environment';
import { alicantoResource } from '../resource';
import { Role } from '../role';
import { lambdaAssets } from './asset/asset';
import type {
  GetCurrentOrContextValueProps,
  GetEnvironmentProps,
  GetRoleArnProps,
  LambdaHandlerProps,
} from './lambda.types';

export class LambdaHandler extends alicantoResource.make(LambdaFunction) {
  constructor(scope: Construct, id: string, props: LambdaHandlerProps) {
    const appContext = LambdaHandler.getAppContext(scope);
    const moduleContext = LambdaHandler.getModuleContext(scope);
    const contextValueProps = {
      lambda: props.lambda,
      appContext: appContext,
      moduleContext: moduleContext,
    };
    const runtime = LambdaHandler.getCurrentOrContextValue({
      key: 'runtime',
      defaultValue: 22,
      ...contextValueProps,
    });

    const environmentProps: GetEnvironmentProps = {
      ...contextValueProps,
      id,
      scope,
    };

    const environments = LambdaHandler.getCurrentEnvironment(environmentProps);
    let environmentValues = environments.getValues();

    const handlerName =
      `${id}-${moduleContext?.contextCreator || appContext.contextCreator}${props.suffix ? `-${props.suffix}` : ''}`.toLowerCase();
    const roleArn = LambdaHandler.getRoleArn({
      name: handlerName,
      scope,
      appContext,
      moduleContext,
      services: props.lambda?.services,
    });

    super(scope, id, {
      functionName: handlerName,
      role: roleArn,
      filename: 'unresolved',
      handler: `index.${props.name}_${props.originalName}`,
      runtime: `nodejs${runtime}.x`,
      timeout: LambdaHandler.getCurrentOrContextValue({
        key: 'timeout',
        ...contextValueProps,
      }),
      memorySize: LambdaHandler.getCurrentOrContextValue({
        key: 'memory',
        ...contextValueProps,
      }),
      description: props.description,
      tracingConfig: {
        mode: props.lambda?.enableTrace ? 'Active' : 'PassThrough',
      },
      environment: {
        variables: !environmentValues ? {} : environmentValues,
      },
    });

    if (!environmentValues) {
      this.isDependent(() => {
        environmentValues = environments.getValues();

        if (environments) {
          throw new Error(`unresolved dependencies in ${props.name} lambda`);
        }

        this.addOverride('environment.variables', environments);
      });
    }

    lambdaAssets.addLambda({
      filename: props.filename,
      foldername: props.foldername,
      lambda: this,
      scope: this,
    });

    this.addPermission(handlerName, props.principal);
  }

  private addPermission(name: string, principal?: string) {
    if (principal) {
      new LambdaPermission(this, 'permission', {
        functionName: name,
        action: 'lambda:InvokeFunction',
        principal,
      });
    }
  }

  private static getAppContext(scope: Construct) {
    const context = scope.node.tryGetContext(ContextName.app);
    if (!context) {
      throw new Error('Context not found');
    }

    return context;
  }

  private static getModuleContext(scope: Construct) {
    return scope.node.tryGetContext(ContextName.module);
  }

  private static getCurrentOrContextValue<
    T extends keyof Omit<GlobalContext, 'contextCreator'>,
  >(props: GetCurrentOrContextValueProps<T>) {
    const { lambda = {}, appContext, moduleContext, key, defaultValue } = props;

    return lambda?.[key] ?? moduleContext?.[key] ?? appContext?.[key] ?? defaultValue;
  }

  private static getCurrentEnvironment(props: GetEnvironmentProps) {
    const { appContext, moduleContext, lambda, scope, id } = props;
    const globalEnv = {
      ...(appContext.env || {}),
      ...(moduleContext?.env || {}),
    };

    const env = new Environment(
      scope,
      `${id}-lambda-env`,
      !lambda?.env ? {} : lambda?.env,
      globalEnv
    );

    return env;
  }

  private static getRoleArn(props: GetRoleArnProps) {
    const { services, appContext, moduleContext, name, scope } = props;

    if (!services) {
      const appRole = alicantoResource.getResource<Role>(
        'app',
        `${appContext.contextCreator}-global-role`
      );

      const moduleRole = alicantoResource.getResource<Role | undefined>(
        'module',
        `${moduleContext?.contextCreator}-module-role`
      );

      return moduleRole?.arn || appRole.arn;
    }

    const role = new Role(scope, 'lambda-role', {
      name: `${name}-role`,
      services,
    });

    return role.arn;
  }
}
