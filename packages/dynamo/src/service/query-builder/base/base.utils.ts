import type { FilterResolverTypes } from './base.types';

export interface ExpressionResolverResult {
  expression: string;
  attributeValues: Record<string, any>;
}

export const expressionResolver = <V>(
  key: string,
  valueName: V,
  sign: string,
  value: any
): ExpressionResolverResult => {
  const valueResolver = `:${valueName}`;
  return {
    expression: `${key} ${sign} ${valueResolver}`,
    attributeValues: {
      [valueResolver]: value,
    },
  };
};

export const filterResolver = {
  equal: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '=', value);
  },
  lessThan: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '<', value);
  },
  lessOrEqualThan: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '<=', value);
  },
  greaterThan: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '>', value);
  },
  greaterOrEqualThan: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '>=', value);
  },
  between: (key: string, valueName: string, value: any): ExpressionResolverResult => {
    return {
      expression: `${key} BETWEEN :${valueName}_0 and :${valueName}_1`,
      attributeValues: {
        [`:${valueName}_0`]: value[0],
        [`:${valueName}_1`]: value[1],
      },
    };
  },
  beginsWith: (key: string, valueName: string, value: any): ExpressionResolverResult => {
    const valueResolver = `:${valueName}`;

    return {
      expression: `begins_with(${key}, ${valueResolver})`,
      attributeValues: {
        [valueResolver]: value,
      },
    };
  },
  contains: (key: string, valueName: string, value: any): ExpressionResolverResult => {
    const valueResolver = `:${valueName}`;

    return {
      expression: `contains(${key}, ${valueResolver})`,
      attributeValues: {
        [valueResolver]: value,
      },
    };
  },
  exist: (key: string): ExpressionResolverResult => {
    return {
      expression: `attribute_exists(${key})`,
      attributeValues: {},
    };
  },
  notExist: (key: string): ExpressionResolverResult => {
    return {
      expression: `attribute_not_exists(${key})`,
      attributeValues: {},
    };
  },
  notEqual: (key: string, valueName: string, value: any) => {
    return expressionResolver(key, valueName, '<>', value);
  },
  in: (key: string, valueName: any, values: any[]): ExpressionResolverResult => {
    const valueResolvers = values.map((_, index) => `:${valueName}_${index}`);

    return {
      expression: `${key} in (${valueResolvers.join(',')})`,
      attributeValues: valueResolvers.reduce(
        (acc, valueResolver, index) => {
          acc[valueResolver] = values[index];
          return acc;
        },
        {} as Record<string, any>
      ),
    };
  },
  notContains(key: string, valueName: string, value: any) {
    const data = this.contains(key, valueName, value);

    data.expression = `not ${data.expression}`;

    return data;
  },
};

export const notValueKeys = new Set<FilterResolverTypes>(['exist', 'notExist']);

export const filterKeys = new Set([...Object.keys(filterResolver)]);
