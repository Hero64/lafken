import { marshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';
import type { LocalIndex } from '../../../main';
import type { GlobalIndexProperty } from '../dynamo-index/dynamo-index.types';
import type { AndFilter, Filter, KeyCondition, OrFilter } from '../query-builder.types';
import type {
  FilterResolverTypes,
  QueryBuilderProps,
  ResolveFilterProps,
} from './base.types';
import { filterKeys, filterResolver } from './base.utils';

export class QueryBuilderBase<E extends ClassResource> {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: ''
  constructor(private options: QueryBuilderProps<E>) {}

  protected attributeNames: Record<string, string> = {};
  protected attributeValues: Record<string, any> = {};
  protected expressionGroupCounter = 0;

  protected getKeyConditionExpression(
    expression: KeyCondition<E>,
    index?: LocalIndex<E> | GlobalIndexProperty
  ) {
    const { partition, sort } = expression;

    const isGlobalIndex = index?.type === 'global';

    this.validateGlobalKey(Object.keys(partition), isGlobalIndex);
    sort && this.validateGlobalKey(Object.keys(sort), isGlobalIndex);

    const partitionFilters: string[] = [];

    for (const key in partition) {
      partitionFilters.push(
        this.resolveFilter({
          expressionName: key,
          value: partition[key],
          filterExpressionKey: 'equal',
        })
      );
    }

    if (!sort) {
      return partitionFilters.join(' and ');
    }

    let sortValues = sort;
    if (isGlobalIndex) {
      let sortCount = Object.keys(sort).length;
      sortValues = {};
      let lastOmittedAttribute: string | undefined;
      for (const attribute of index.sortKey) {
        const attributeName = attribute as keyof typeof sort;
        if (sort[attributeName]) {
          if (lastOmittedAttribute) {
            throw new Error(
              `The sortKey is read from left to right. It is not possible to skip values; you must include the attribute"${lastOmittedAttribute}". Check the index "${index.name}"`
            );
          }

          if (sortCount > 1 && typeof sort[attributeName] === 'object') {
            throw new Error(
              'Only the last attribute in the index sortKey can add a value different from the equal.'
            );
          }
          sortValues[attributeName] = sort[attributeName];
          sortCount--;
          continue;
        }

        lastOmittedAttribute = attribute;
      }
    }

    for (const key in sortValues) {
      let filterExpressionKey: FilterResolverTypes = 'equal';

      let sortValue = sort[key];
      if (typeof sortValue === 'object') {
        filterExpressionKey = Object.keys(sortValue || {})[0] as FilterResolverTypes;
        sortValue = (sortValue as any)[filterExpressionKey];
      }

      partitionFilters.push(
        this.resolveFilter({
          expressionName: key,
          value: sortValue,
          filterExpressionKey,
        })
      );
    }

    return partitionFilters.join(' and ');
  }

  protected getFilterExpression<T>(
    filter: Filter<T> | OrFilter<T> | AndFilter<T>,
    names: string[] = [],
    union: 'or' | 'and' = 'and',
    counter = 0
  ) {
    counter += 1;
    const filterExpression: string[] = [];
    let index = 0;
    for (const key in filter) {
      switch (key) {
        case 'OR': {
          const orFilter = filter as OrFilter<T>;
          const orExpressions: string[] = [];
          for (const condition of orFilter.OR) {
            const expression = this.getFilterExpression(condition, names, 'and', counter);
            counter += 1;
            orExpressions.push(expression);
          }

          const joined = orExpressions.join(' or ');
          filterExpression.push(orExpressions.length > 1 ? `(${joined})` : joined);
          break;
        }
        case 'AND': {
          const andFilter = filter as AndFilter<T>;
          const andExpressions: string[] = [];
          for (const condition of andFilter.AND) {
            const expression = this.getFilterExpression(condition, names, 'and', counter);
            counter += 1;
            andExpressions.push(expression);
          }

          filterExpression.push(andExpressions.join(' and '));
          break;
        }
        default: {
          const currentKeyNames = [...names, key];
          const keyName = currentKeyNames.join('.#');
          const keyValue = `${currentKeyNames.join('_')}_${counter}_${index}`;

          const keyFilter = (filter as unknown as Filter<T>)[key as keyof T] as Filter<T>;

          if (typeof keyFilter === 'object') {
            const keys = Object.keys(keyFilter || {});
            const filterResolver = keys.find((key) => filterKeys.has(key));

            if (filterResolver) {
              const expression = this.resolveFilter({
                expressionName: keyName,
                keyName: key,
                filterExpressionKey: filterResolver as FilterResolverTypes,
                expressionValue: keyValue,
                value: keyFilter[filterResolver as keyof Filter<T>],
              });

              filterExpression.push(expression);
              break;
            }
            this.attributeNames[`#${key}`] = key;
            const expression = this.getFilterExpression(
              keyFilter,
              currentKeyNames,
              union
            );
            filterExpression.push(expression);
            break;
          }
          const expression = this.resolveFilter({
            expressionName: keyName,
            keyName: key,
            filterExpressionKey: 'equal',
            expressionValue: keyValue,
            value: keyFilter,
          });
          filterExpression.push(expression);
        }
      }
      index++;
    }

    return filterExpression.join(` ${union} `);
  }

  protected getAttributesAndNames() {
    return {
      ExpressionAttributeNames:
        Object.keys(this.attributeNames).length > 0 ? this.attributeNames : undefined,
      ExpressionAttributeValues:
        Object.keys(this.attributeValues).length > 0
          ? marshall(this.attributeValues, { removeUndefinedValues: true })
          : undefined,
    };
  }

  private resolveFilter = ({
    expressionName,
    filterExpressionKey,
    expressionValue,
    value,
    keyName = expressionName,
  }: ResolveFilterProps) => {
    const name = `#${expressionName}`;

    const { attributeValues, expression } = filterResolver[filterExpressionKey](
      name,
      expressionValue || expressionName,
      value
    );

    this.attributeNames[`#${keyName}`] = keyName;
    this.attributeValues = {
      ...this.attributeValues,
      ...attributeValues,
    };

    return expression;
  };

  private validateGlobalKey(keys: string[], isGlobalIndex: boolean) {
    if (keys.length > 1 && !isGlobalIndex) {
      throw new Error(
        'partition keys only support multi-attributes when they are a global multi-attribute index.'
      );
    }
  }
}
