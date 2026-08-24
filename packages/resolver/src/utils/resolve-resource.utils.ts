import type { GetExternalValues, GetResourceProps, OutputType } from '@lafken/common';
import { Fn, Token } from 'cdktn';
import type { Construct } from 'constructs';
import { lafkenResource } from '../resources';
import { contextFactory } from '../resources/context/context';
import { ssmFactory } from '../resources/ssm/ssm';

export class ResolveResources {
  private unresolved: string[] = [];

  public getResourceValue(module: string, id: string, type: OutputType) {
    this.unresolved = [];

    const resource = lafkenResource.getResource(module, id);

    if (!resource) {
      this.unresolved.push(`${module}::${id}::${type}`);
      return '';
    }

    if (!(type in resource)) {
      throw new Error(`property ${type} in ${module}::${id} not found`);
    }

    return resource[type];
  }

  public hasUnresolved() {
    return this.unresolved.length > 0;
  }
}

export const getExternalValues = (scope: Construct): GetExternalValues => {
  return {
    getSSMValue: (value, secure = false) => {
      return ssmFactory.getValue(scope, value, secure);
    },
    fn: Fn,
    token: Token,
    get accountId() {
      return contextFactory.getAccountId(scope);
    },
    get callerArn() {
      return contextFactory.getCallerArn(scope);
    },
    get region() {
      return contextFactory.getRegionName(scope);
    },
    get partition() {
      return contextFactory.getPartitionName(scope);
    },
    get dnsSuffix() {
      return contextFactory.getDnsSuffix(scope);
    },
  };
};

export const resolveCallbackResource = <T>(
  scope: Construct,
  callback: (props: GetResourceProps) => T
) => {
  const resolveResources = new ResolveResources();
  const values = callback({
    getResourceValue: (value, type) => {
      const moduleWithId = value.replace('::', '##').split('##');

      if (moduleWithId.length !== 2) {
        throw new Error(`resource value ${value} is not valid`);
      }

      return resolveResources.getResourceValue(moduleWithId[0], moduleWithId[1], type);
    },
    ...getExternalValues(scope),
  });
  if (resolveResources.hasUnresolved()) {
    return false;
  }

  return values;
};
