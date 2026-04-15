import { LambdaAlias } from '@cdktn/provider-aws/lib/lambda-alias';
import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import { LambdaPermission } from '@cdktn/provider-aws/lib/lambda-permission';
import { LambdaProvisionedConcurrencyConfig } from '@cdktn/provider-aws/lib/lambda-provisioned-concurrency-config';
import { type AliasConfig, kebabCase, type VpcConfigValue } from '@lafken/common';
import type { Construct } from 'constructs';
import type { GlobalContext } from '../../types';
import { getAppContext, getExternalValues, getModuleContext } from '../../utils';
import { Environment } from '../environment/environment';
import { lafkenResource } from '../resource';
import { Role } from '../role';
import { lambdaAssets } from './asset/asset';
import type {
  GetCurrentOrContextValueProps,
  GetEnvironmentProps,
  GetRoleArnProps,
  LambdaHandlerProps,
} from './lambda.types';

export class LambdaHandler extends lafkenResource.make(LambdaFunction) {
  constructor(scope: Construct, id: string, props: LambdaHandlerProps) {
    const appContext = getAppContext(scope);
    const moduleContext = getModuleContext(scope);

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

    const alias = LambdaHandler.getCurrentOrContextValue({
      key: 'alias',
      ...contextValueProps,
    });

    const environmentProps: GetEnvironmentProps = {
      ...contextValueProps,
      id,
      scope,
    };

    const environments = LambdaHandler.getCurrentEnvironment(environmentProps);
    let environmentValues = environments?.getValues();
    const hasValues = !!environmentValues;

    const suffix = props.suffix ? `-${props.suffix}` : '';

    const handlerName = `${kebabCase(
      `${id}-${moduleContext?.contextCreator || appContext.contextCreator}`
    ).slice(0, 63 - suffix.length)}${suffix}`.toLowerCase();

    const role = LambdaHandler.getRoleArn({
      name: handlerName,
      scope,
      appContext,
      moduleContext,
      services: props.lambda?.services,
    });

    super(scope, id, {
      functionName: handlerName,
      role: role.arn,
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
        variables: hasValues ? environmentValues || {} : {},
      },
      dependsOn: [role, role.policy],
    });

    if (environments && !environmentValues) {
      this.isDependent(() => {
        environmentValues = environments.getValues();

        if (!environmentValues) {
          throw new Error(`unresolved dependencies in ${props.name} lambda`);
        }

        this.putEnvironment({
          variables: environmentValues,
        });
      });
    }

    lambdaAssets.addLambda({
      filename: props.filename,
      foldername: props.foldername,
      lambda: this,
      scope: this,
    });

    this.addVpcConfig(props.lambda?.vpcConfig);
    this.addAlias(handlerName, alias);
    this.addPermission(handlerName, props);
  }

  private addPermission(name: string, props: LambdaHandlerProps) {
    if (!props.principal) {
      return;
    }

    new LambdaPermission(this, 'permission', {
      functionName: name,
      action: 'lambda:InvokeFunction',
      principal: props.principal,
      sourceArn: props.sourceArn,
      sourceAccount: props.sourceAccount,
      dependsOn: [this],
    });
  }

  private addAlias(functionName: string, aliasConfig?: AliasConfig) {
    if (!aliasConfig) {
      return;
    }

    this.publish = true;

    const alias = new LambdaAlias(this, 'alias', {
      name: aliasConfig.name,
      functionName,
      functionVersion: this.version,
    });

    if (aliasConfig.provisionedExecutions && aliasConfig.provisionedExecutions > 0) {
      new LambdaProvisionedConcurrencyConfig(this, 'provisioned-concurrency', {
        functionName,
        qualifier: alias.name,
        provisionedConcurrentExecutions: aliasConfig.provisionedExecutions,
        dependsOn: [alias],
      });
    }
  }

  private addVpcConfig(vpcConfig?: VpcConfigValue) {
    if (!vpcConfig) {
      return;
    }

    this.putVpcConfig(
      typeof vpcConfig === 'function' ? vpcConfig(getExternalValues(this)) : vpcConfig
    );
  }

  private static getCurrentOrContextValue<
    T extends keyof Omit<GlobalContext, 'contextCreator' | 'minify'>,
  >(props: GetCurrentOrContextValueProps<T>) {
    const { lambda = {}, appContext, moduleContext, key, defaultValue } = props;

    return lambda?.[key] ?? moduleContext?.[key] ?? appContext?.[key] ?? defaultValue;
  }

  private static getCurrentEnvironment(props: GetEnvironmentProps) {
    const { lambda, scope, id } = props;

    if (!lambda?.env) {
      return undefined;
    }

    const env = new Environment(scope, `${id}-lambda-env`, lambda?.env);

    return env;
  }

  private static getRoleArn(props: GetRoleArnProps) {
    const { services, appContext, moduleContext, name, scope } = props;

    if (!services) {
      const appRole = lafkenResource.getResource<Role>(
        'app',
        `${appContext.contextCreator}-global-role`
      );

      const moduleRole = lafkenResource.getResource<Role | undefined>(
        'module',
        `${moduleContext?.contextCreator}-module-role`
      );

      return moduleRole || appRole;
    }

    const role = new Role(scope, 'lambda-role', {
      name: `${name}-role`,
      services,
    });

    return role;
  }
}
