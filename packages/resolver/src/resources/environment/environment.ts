import type { EnvironmentValue } from '@lafken/common';
import { Construct } from 'constructs';
import { resolveCallbackResource } from '../../utils/resolve-resource.utils';

export class Environment extends Construct {
  constructor(
    scope: Construct,
    id: string,
    private envs: EnvironmentValue,
    private additionalEnvProps: Record<string, string> = {}
  ) {
    super(scope, id);
  }

  public getValues(): Record<string, string> | false {
    let values: Record<string, string> = {};

    if (typeof this.envs === 'function') {
      const resolveEnv = resolveCallbackResource(this, this.envs);
      if (!resolveEnv) {
        return false;
      }

      values = resolveEnv;
    } else {
      values = this.envs;
    }

    return { ...values, ...this.additionalEnvProps };
  }
}
