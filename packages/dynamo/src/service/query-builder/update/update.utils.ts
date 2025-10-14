import { expressionResolver } from '../base/base.utils';

export const updateResolver = {
  incrementValue: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, `= ${key} + `, value);
  },
  decrementValue: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, `= ${key} - `, value);
  },
  ifNotExistValue: (key: string, valueName: string, value: any) => {
    const valueResolver = `:${valueName}`;
    return {
      expression: `${key} = if_not_exists(${key}, ${valueResolver})`,
      attributeValues: {
        [valueResolver]: value,
      },
    };
  },
};

export const updateResolverKeys = new Set([...Object.keys(updateResolver)]);
