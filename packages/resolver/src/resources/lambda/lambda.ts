import { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import { LambdaPermission } from '@cdktf/provider-aws/lib/lambda-permission';
import type { TerraformAsset } from 'cdktf';
import { Construct } from 'constructs';
import { ContextName, type GlobalContext } from '../../types';
import { Environment } from '../environment/environment';
import { alicantoResource } from '../resource';
import { Role } from '../role';
import { lambdaAssets } from './asset/asset';
import type { LambdaHandlerProps } from './lambda.types';

export class LambdaHandler extends Construct {
  private appContext: GlobalContext;
  private moduleContext?: GlobalContext;

  constructor(
    private scope: Construct,
    private id: string,
    private props: LambdaHandlerProps
  ) {
    super(scope, id);
    this.appContext = this.getAppContext();
    this.moduleContext = this.getModuleContext();
  }

  async generate() {
    const asset = await lambdaAssets.buildHandler(this.scope, this.props);
    return this.createLambdaFunction(asset);
  }

  private createLambdaFunction(asset: TerraformAsset) {
    const name = this.getHandlerName();
    const roleId = this.getRoleArn(name);

    let environments = this.getCurrentEnvironment();

    const lambda = alicantoResource.create(
      'lambda',
      LambdaFunction,
      this.scope,
      'lambda',
      {
        functionName: name,
        role: roleId,
        filename: asset.path,
        handler: `index.${this.props.name}`,
        runtime: this.getRuntime(),
        timeout: this.getCurrentOrContextValue('timeout'),
        memorySize: this.getCurrentOrContextValue('memory'),
        description: this.props.description,
        tracingConfig: {
          mode: this.props.lambda?.enableTrace ? 'Active' : 'PassThrough',
        },
        environment: {
          variables: !environments ? {} : environments,
        },
      }
    );

    if (!environments) {
      lambda.isDependent(() => {
        environments = this.getCurrentEnvironment();

        if (environments) {
          throw new Error(`unresolved dependencies in ${name} lambda`);
        }

        lambda.addOverride('environment.variables', environments);
      });
    }

    this.addPermission(name);
    return lambda;
  }

  private addPermission(name: string) {
    if (this.props.principal) {
      new LambdaPermission(this, 'permission', {
        functionName: name,
        action: 'lambda:InvokeFunction',
        principal: this.props.principal,
      });
    }
  }

  private getAppContext() {
    const context = this.node.tryGetContext(ContextName.APP);
    if (!context) {
      throw new Error('Context not found');
    }

    return context;
  }

  private getModuleContext() {
    return this.node.tryGetContext(ContextName.MODULE);
  }

  private getCurrentOrContextValue<T extends keyof GlobalContext>(
    key: T,
    defaultValue?: GlobalContext[T]
  ) {
    return (
      this.props.lambda?.[key] ??
      this.moduleContext?.[key] ??
      this.appContext?.[key] ??
      defaultValue
    );
  }

  private getRuntime() {
    return `nodejs${this.getCurrentOrContextValue('runtime', 22)}.x`;
  }

  private getHandlerName() {
    return `${this.id}-${this.props.suffix ? `-${this.props.suffix}` : ''}`.toLowerCase();
  }

  private getCurrentEnvironment() {
    const globalEnv = {
      ...(this.appContext.env || {}),
      ...(this.moduleContext?.env || {}),
    };
    const env = new Environment(
      this,
      'lambda-env',
      !this.props.lambda?.env ? {} : this.props.lambda?.env,
      globalEnv
    );

    return env.getValues();
  }

  private getRoleArn(name: string) {
    if (!this.props.lambda?.services) {
      return '';
    }

    const role = new Role(this, 'lambda-role', {
      name: `${name}-role`,
      services: this.props.lambda.services,
    });

    return role.arn;
  }
}
