import { cleanString, type EnvironmentValue } from '@alicanto/common';
import { DataAwsSsmParameter } from '@cdktf/provider-aws/lib/data-aws-ssm-parameter';
import { Construct } from 'constructs';
import { ResolveResources } from '../../utils/resolve-resource.utils';

const ssmValues: Record<string, DataAwsSsmParameter> = {};

const getSSMValue = (
  scope: Construct,
  id: string,
  path: string,
  withDecryption: boolean
) => {
  if (ssmValues[path]) {
    return ssmValues[path].value;
  }

  return new DataAwsSsmParameter(scope, `${id}-ssm`, {
    name: id,
    withDecryption,
  }).value;
};

const SSM_PARSER = {
  'SSM::STRING': (scope: Construct, id: string, path: string) => {
    return getSSMValue(scope, id, path, false);
  },
  'SSM::SECURE_STRING': (scope: Construct, id: string, path: string) => {
    return getSSMValue(scope, id, path, true);
  },
};

const ssmTypes = new Set(Object.keys(SSM_PARSER));

export class Environment extends Construct {
  constructor(
    private scope: Construct,
    id: string,
    private envs: EnvironmentValue,
    private additionalEnvProps: Record<string, string> = {}
  ) {
    super(scope, id);
  }

  public getValues(): Record<string, string> | false {
    let values: Record<string, string> = {};

    if (typeof this.envs === 'function') {
      const resolveResources = new ResolveResources();
      values = this.envs(resolveResources);
      if (resolveResources.hasUnresolved()) {
        return false;
      }
    } else {
      values = this.envs;
    }

    values = { ...values, ...this.additionalEnvProps };

    for (const key in values) {
      values[key] = this.resolveEnvParameter(values[key]);
    }

    return values;
  }

  private resolveEnvParameter = (value: string) => {
    const ssmValue = value.split('::');

    const isSSMParameter =
      ssmValue.length === 3 && ssmTypes.has(`${ssmValue[0]}::${ssmValue[1]}`);

    if (!isSSMParameter) {
      return value;
    }
    const [service, parameterType, path] = ssmValue;

    return SSM_PARSER[`${service}::${parameterType}` as keyof typeof SSM_PARSER](
      this.scope,
      cleanString(value),
      path
    );
  };
}
