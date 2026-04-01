import type { GetResourceProps } from '@lafken/common';
import type { Construct } from 'constructs';
import { lafkenResource } from '../resources';
import { ssmFactory } from '../resources/ssm/ssm';

export class ResolveResources {
  private unresolved: string[] = [];

  public getResourceValue(module: string, id: string, type: string) {
    this.unresolved = [];

    const resource = lafkenResource.getResource(module, id);

    if (!resource) {
      this.unresolved.push(`${module}::${id}::${type}`);
      return '';
    }

    const propertyValue = resource[type];
    if (!propertyValue) {
      throw new Error(`property ${type} in ${module}::${id} not found`);
    }

    return propertyValue;
  }

  public hasUnresolved() {
    return this.unresolved.length > 0;
  }
}

export const resolverSSMValues = (
  scope: Construct
): Pick<GetResourceProps, 'getSSMValue'> => {
  return {
    getSSMValue: (value, secure = false) => {
      return ssmFactory.getValue(scope, value, secure);
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
      const moduleWithId = value.split('::');

      if (moduleWithId.length !== 2) {
        throw new Error(`resource value ${value} is not valid`);
      }

      return resolveResources.getResourceValue(
        moduleWithId[0],
        moduleWithId[1],
        type as string
      );
    },
    ...resolverSSMValues(scope),
  });
  if (resolveResources.hasUnresolved()) {
    return false;
  }

  return values;
};
