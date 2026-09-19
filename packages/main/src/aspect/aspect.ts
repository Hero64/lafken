import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import type { VpcConfig } from '@lafken/common';
import type { IAspect } from 'cdktn';
import type { Construct, IConstruct } from 'constructs';
import type {
  AppAspectProps,
  OriginalLambdaValue,
  TaggableResource,
} from './aspect.types';

const lambdaValues: OriginalLambdaValue = {
  env: {},
  vpcConfig: {},
};

export class AppAspect implements IAspect {
  private env: Record<string, string>;
  private vpcConfig: VpcConfig;

  constructor(
    _scope: Construct,
    _id: string,
    private props: AppAspectProps
  ) {
    this.initializeEnvironment();
    this.initializeVpcConfig();
  }

  public visit(node: IConstruct) {
    if (this.props.tags && this.isTaggableResource(node)) {
      const currentTags = node.tagsInput || {};
      node.tags = { ...this.props.tags, ...currentTags };
    }

    if (node instanceof LambdaFunction) {
      this.addEnvironmentValues(node);
      this.addVpcConfig(node);
    }
  }

  private initializeEnvironment() {
    if (!this.props.environment) {
      return;
    }

    this.env = this.props.environment;
  }

  private initializeVpcConfig() {
    if (!this.props.vpc) {
      return;
    }

    this.vpcConfig = this.props.vpc;
  }

  private addEnvironmentValues(node: LambdaFunction) {
    if (!this.env) {
      return;
    }
    const currentVars = node.environmentInput?.variables || {};
    lambdaValues.env[node.node.addr] ??= currentVars;

    node.putEnvironment({
      variables: {
        ...currentVars,
        ...this.env,
        ...lambdaValues.env[node.node.addr],
      },
    });
  }

  private addVpcConfig(node: LambdaFunction) {
    if (!this.vpcConfig) {
      return;
    }

    lambdaValues.vpcConfig[node.node.addr] ??= node.vpcConfigInput || {};
    const hasProperties = Object.keys(lambdaValues.vpcConfig[node.node.addr]).length > 0;

    node.putVpcConfig(
      hasProperties ? lambdaValues.vpcConfig[node.node.addr] : this.vpcConfig
    );
  }

  private isTaggableResource(resource: Construct): resource is TaggableResource {
    return 'tags' in resource && 'tagsInput' in resource;
  }
}
