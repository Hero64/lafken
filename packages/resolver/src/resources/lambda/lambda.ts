import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { LambdaAlias } from '@cdktn/provider-aws/lib/lambda-alias';
import {
  LambdaFunction,
  type LambdaFunctionConfig,
} from '@cdktn/provider-aws/lib/lambda-function';
import { LambdaPermission } from '@cdktn/provider-aws/lib/lambda-permission';
import { LambdaProvisionedConcurrencyConfig } from '@cdktn/provider-aws/lib/lambda-provisioned-concurrency-config';
import {
  type AliasConfig,
  type GetResourceProps,
  kebabCase,
  type LambdaOutputAttributes,
  type LoggingConfig,
  type ServicesValues,
  type VpcConfigValue,
} from '@lafken/common';
import { dependable } from 'cdktn';
import type { Construct } from 'constructs';
import type { GlobalContext } from '../../types';
import { getAppContext, getExternalValues, getModuleContext } from '../../utils';
import { Environment } from '../environment/environment';
import { ResourceOutput } from '../output/output';
import { lafkenResource } from '../resource';
import { Role } from '../role';
import { lambdaAssets } from './asset/asset';
import type {
  CommonContextProps,
  GetCurrentOrContextValueProps,
  GetEnvironmentProps,
  GetRoleArnProps,
  LambdaHandlerProps,
  ResolvedLambdaContext,
} from './lambda.types';

export class LambdaHandler extends lafkenResource.make(LambdaFunction) {
  constructor(scope: Construct, id: string, props: LambdaHandlerProps) {
    const appContext = getAppContext(scope);
    const moduleContext = getModuleContext(scope);
    const contextValueProps: CommonContextProps = {
      lambda: props.lambda,
      appContext,
      moduleContext,
    };

    const ctx = LambdaHandler.resolveContextValues(contextValueProps);
    const environments = LambdaHandler.getCurrentEnvironment({
      ...contextValueProps,
      id,
      scope,
    });
    let environmentValues = environments?.getValues() || undefined;
    const handlerName = LambdaHandler.buildFunctionName(
      id,
      appContext,
      moduleContext,
      props.suffix
    );

    super(
      scope,
      id,
      LambdaHandler.buildFunctionConfig(handlerName, ctx, props, environmentValues)
    );

    if (props.lambda?.ref) {
      this.register('lambda', props.lambda.ref);
    }

    new ResourceOutput<LambdaOutputAttributes>(this, props.lambda?.outputs);

    this.setRole({
      appContext,
      moduleContext,
      name: handlerName,
      services: props.lambda?.services,
    });

    if (environments && !environmentValues) {
      this.onResolve(() => {
        environmentValues = environments.getValues() || undefined;

        if (!environmentValues) {
          throw new Error(`unresolved dependencies in ${props.name} lambda`);
        }

        this.putEnvironment({ variables: environmentValues });
      });
    }

    lambdaAssets.addLambda({
      filename: props.filename,
      foldername: props.foldername,
      lambda: this,
      scope: this,
    });

    this.addVpcConfig(props.lambda?.vpcConfig);
    this.addLoggingConfig(handlerName, ctx.loggingConfig);
    this.addAlias(handlerName, ctx.alias);
    this.addPermission(handlerName, props);
  }

  private static resolveContextValues(props: CommonContextProps): ResolvedLambdaContext {
    return {
      runtime: LambdaHandler.getCurrentOrContextValue({
        key: 'runtime',
        defaultValue: 22,
        ...props,
      })!,
      alias: LambdaHandler.getCurrentOrContextValue({ key: 'alias', ...props }),
      loggingConfig: LambdaHandler.getCurrentOrContextValue({
        key: 'loggingConfig',
        ...props,
      }),
      architecture: LambdaHandler.getCurrentOrContextValue({
        key: 'architecture',
        ...props,
      }),
      ephemeralStorage: LambdaHandler.getCurrentOrContextValue({
        key: 'ephemeralStorage',
        ...props,
      }),
      reservedConcurrency: LambdaHandler.getCurrentOrContextValue({
        key: 'reservedConcurrency',
        ...props,
      }),
      timeout: LambdaHandler.getCurrentOrContextValue({ key: 'timeout', ...props }),
      memory: LambdaHandler.getCurrentOrContextValue({ key: 'memory', ...props }),
    };
  }

  private static buildFunctionName(
    id: string,
    appContext: GlobalContext,
    moduleContext: GlobalContext | undefined,
    suffix?: string
  ): string {
    const sfx = suffix ? `-${suffix}` : '';

    return `${kebabCase(
      `${id}${moduleContext?.contextCreator ? `-${moduleContext.contextCreator}` : '-'}${appContext.contextCreator}`
    ).slice(0, 63 - sfx.length)}${sfx}`.toLowerCase();
  }

  private static buildFunctionConfig(
    functionName: string,
    ctx: ResolvedLambdaContext,
    props: LambdaHandlerProps,
    environmentValues: Record<string, string> | undefined
  ): LambdaFunctionConfig {
    return {
      functionName,
      role: '',
      filename: 'unresolved',
      handler: `index.${props.name}_${props.originalName}`,
      runtime: `nodejs${ctx.runtime}.x`,
      timeout: ctx.timeout,
      memorySize: ctx.memory,
      description: props.description,
      architectures: ctx.architecture ? [ctx.architecture] : undefined,
      reservedConcurrentExecutions: ctx.reservedConcurrency,
      ephemeralStorage: ctx.ephemeralStorage ? { size: ctx.ephemeralStorage } : undefined,
      tracingConfig: {
        mode: props.lambda?.enableTrace ? 'Active' : 'PassThrough',
      },
      environment: {
        variables: environmentValues ?? {},
      },
    };
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

  private addLoggingConfig(name: string, loggingConfig?: LoggingConfig) {
    if (!loggingConfig) {
      return;
    }

    let logGroupArn: string | undefined;

    if (loggingConfig.retentionInDays) {
      const logGroup = new CloudwatchLogGroup(this, 'lambda-logs', {
        name: `/aws/lambda/${name}`,
        retentionInDays: loggingConfig.retentionInDays,
      });

      logGroupArn = logGroup.arn;
      this.dependsOn = [...(this.dependsOn || []), dependable(logGroup)];
    }

    const logFormatMap = { text: 'Text', json: 'JSON' } as const;

    this.putLoggingConfig({
      logFormat: logFormatMap[loggingConfig.logFormat],
      logGroup: logGroupArn,
      applicationLogLevel: loggingConfig.applicationLogLevel?.toUpperCase(),
      systemLogLevel: loggingConfig.systemLogLevel?.toUpperCase(),
    });
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

    return new Environment(scope, `${id}-lambda-env`, lambda.env);
  }

  private getServiceRole(props: GetResourceProps, services: ServicesValues = []) {
    return Array.isArray(services) ? services : services(props);
  }

  private setRole(props: GetRoleArnProps) {
    const { services, appContext, moduleContext, name } = props;
    const appRole = lafkenResource.getResource<Role>(
      'app',
      `${appContext.contextCreator}-global-role`
    );

    const moduleRole = lafkenResource.getResource<Role | undefined>(
      'module',
      `${moduleContext?.contextCreator}-module-role`
    );

    if (!services) {
      const role = moduleRole || appRole;
      this.role = role.arn;
      this.dependsOn = [dependable(role), dependable(role.policy)];
      return;
    }

    const role = new Role(this, 'lambda-role', {
      name: `${name}-role`,
      services: (props) => {
        return [
          ...this.getServiceRole(props, appRole.services),
          ...this.getServiceRole(props, moduleRole?.services),
          ...this.getServiceRole(props, services),
        ];
      },
    });

    this.role = role.arn;
    this.dependsOn = [dependable(role), dependable(role.policy)];
  }
}
