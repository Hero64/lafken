import type { ClassResource } from '@alicanto/common';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import type { ModelInformation } from '../query-builder.types';
import type { filterResolver } from './base.utils';

export interface QueryBuilderProps<E extends ClassResource> extends ModelInformation<E> {
  client: DynamoDBClient;
}

export type FilterResolverTypes = keyof typeof filterResolver;

export interface ResolveFilterProps {
  /**
   * value without #
   */
  expressionName: string;
  /**
   * value of expression name
   *
   * @default {expressionName}
   */
  /**
   * name used to attribute name
   *
   * @default {expressionName} with '#'
   */
  keyName?: string;
  /**
   * value of expression without :
   */
  expressionValue?: string;
  /**
   * value of expressionValue
   */
  value: any;
  /**
   * key of executed function
   */
  filterExpressionKey: FilterResolverTypes;
}
