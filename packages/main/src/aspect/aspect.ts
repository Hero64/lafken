import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import type { EnvironmentValue } from '@lafken/common';
import { Environment } from '@lafken/resolver';
import type { IAspect } from 'cdktn';
import type { Construct, IConstruct } from 'constructs';

interface TaggableResource extends Construct {
  tags?: Record<string, string>;
  tagsInput?: Record<string, string>;
}

interface AppAspectProps {
  tags?: Record<string, string>;
  environment?: EnvironmentValue;
}

const originalLambdaVariables: Record<string, Record<string, string>> = {};

export class AppAspect implements IAspect {
  private env: Record<string, string>;

  constructor(
    scope: Construct,
    id: string,
    private props: AppAspectProps
  ) {
    if (this.props.environment) {
      const values = new Environment(
        scope,
        `${id}-env`,
        this.props.environment
      ).getValues();

      if (values === false) {
        throw new Error(`resources in ${id} env not found`);
      }

      this.env = values;
    }
  }

  visit(node: IConstruct) {
    if (this.props.tags && this.isTaggableResource(node)) {
      const currentTags = node.tagsInput || {};
      node.tags = { ...this.props.tags, ...currentTags };
    }

    if (this.env && node instanceof LambdaFunction) {
      const currentVars = node.environmentInput?.variables || {};

      originalLambdaVariables[node.node.addr] ??= currentVars;

      node.putEnvironment({
        variables: {
          ...currentVars,
          ...this.env,
          ...originalLambdaVariables[node.node.addr],
        },
      });
    }
  }

  private isTaggableResource(resource: Construct): resource is TaggableResource {
    return 'tags' in resource && 'tagsInput' in resource;
  }
}
