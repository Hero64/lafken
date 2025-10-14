import type { ClassResource, OnlyNumberString } from '@alicanto/common';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoIndex } from '../../../main/model';
import type {
  AndFilter,
  Filter,
  Item,
  KeyCondition,
  OrFilter,
  QueryProps,
} from '../query-builder.types';
import type {
  FilterResolverTypes,
  QueryBuilderProps,
  ResolveFilterProps,
} from './base.types';
import { filterKeys, filterResolver } from './base.utils';

export class QueryBuilderBase<E extends ClassResource> {
  constructor(private options: QueryBuilderProps<E>) {}

  protected attributeNames: Record<string, string> = {};
  protected attributeValues: Record<string, any> = {};

  protected getIndex(props: QueryProps<E>) {
    const {
      keyCondition: { partition, sort },
    } = props;

    const keysInPartition = Object.keys(partition);
    const keysInSort = Object.keys(sort || {});

    if (keysInPartition.length > 1 || keysInSort.length > 1) {
      throw new Error('Should use only item from partition and sort key');
    }

    const selectedPartitionKey = keysInPartition[0];
    const selectedSortKey = keysInSort[0];

    if (
      selectedPartitionKey === this.options.partitionKey &&
      (!sort || selectedSortKey === this.options.sortKey)
    ) {
      return;
    }

    const { indexes } = this.options.modelProps;

    const selectedIndex = indexes.find(
      (index) =>
        index.partitionKey === selectedPartitionKey &&
        (!sort || selectedSortKey === index.sortKey)
    );

    if (!selectedIndex) {
      throw new Error('Partition key or sort key not found');
    }

    return selectedIndex;
  }

  protected validateIndex(props: QueryProps<E>, index?: DynamoIndex<E>) {
    const { filter } = props;
    if (!filter) {
      return;
    }
    let conditionKeys: [string, string | undefined] = [
      this.options.partitionKey,
      this.options.sortKey,
    ];

    if (index) {
      conditionKeys = [index.partitionKey as string, index.sortKey as string];
    }

    let filterKeys = new Set<string>([]);
    if (Array.isArray(filter.OR)) {
      for (const condition of filter.OR) {
        Object.keys(condition).forEach(filterKeys.add, filterKeys);
        if (condition.AND) {
          Object.keys(condition.AND).forEach(filterKeys.add, filterKeys);
        }
      }
    } else {
      filterKeys = new Set([...Object.keys(filter)]);
    }

    if (filterKeys.has(conditionKeys[0]) || filterKeys.has(conditionKeys[1] as string)) {
      throw new Error('Partition and sort key should not be in the filter condition');
    }
  }

  protected getKeyConditionExpression(expression: KeyCondition<E>) {
    const { partition, sort } = expression;
    const partitionName = Object.keys(partition)[0];
    const partitionValue = partition[partitionName as keyof Partial<OnlyNumberString<E>>];

    const partitionFilter = this.resolveFilter({
      expressionName: partitionName,
      value: partitionValue,
      filterExpressionKey: 'equal',
    });

    if (!sort) {
      return partitionFilter;
    }

    const sortName = Object.keys(sort)[0];
    let sortValue = (sort as any)[sortName];
    let resolverName: FilterResolverTypes = 'equal';

    if (typeof sortValue === 'object' && sortValue) {
      resolverName = Object.keys(sortValue || {})[0] as FilterResolverTypes;
      sortValue = (sortValue as any)[resolverName];
    }

    const sortFilter = this.resolveFilter({
      expressionName: sortName,
      value: sortValue,
      filterExpressionKey: resolverName,
    });

    return `${partitionFilter} and ${sortFilter}`;
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

          filterExpression.push(`(${orExpressions.join(' or ')})`);
          break;
        }
        case 'AND': {
          const andFilter = filter as AndFilter<T>;
          const expression = this.getFilterExpression(
            andFilter.AND,
            names,
            'and',
            counter
          );

          filterExpression.join(`(${expression})`);
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

    return `(${filterExpression.join(` ${union} `)})`;
  }

  protected validateKey = (key: Partial<Item<E>>) => {
    const keys = new Set(Object.keys(key));

    if (
      keys.size > 3 ||
      !keys.has(this.options.partitionKey) ||
      (keys.size === 2 && this.options.sortKey && !keys.has(this.options.sortKey))
    ) {
      throw new Error('Key are only composed of partition and sort key');
    }
  };

  protected getAttributesAndNames() {
    return {
      ExpressionAttributeNames:
        Object.keys(this.attributeNames).length > 0 ? this.attributeNames : undefined,
      ExpressionAttributeValues:
        Object.keys(this.attributeValues).length > 0
          ? marshall(this.attributeValues)
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
}
