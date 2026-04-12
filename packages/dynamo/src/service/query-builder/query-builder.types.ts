import 'reflect-metadata';
import type {
  ClassResource,
  DeepPartial,
  KeyOfClass,
  OnlyNumberString,
  OnlyOne,
} from '@lafken/common';
import type {
  FieldsMetadata,
  PrimaryPartition,
  TablePartition,
  TablePayPerRequest,
  TableProvisioned,
} from '../../main/table';

interface RequiredName {
  name: string;
}

export type ModelMetadata<T extends Function> =
  | (TableProvisioned<T> & RequiredName)
  | (TablePayPerRequest<T> & RequiredName);

export type OperationExpression<E> = OnlyOne<{
  lessThan: E;
  lessOrEqualThan: E;
  greaterThan: E;
  greaterOrEqualThan: E;
  between: [E, E];
}>;

export type InExpression<E extends string | number> = {
  in: E[];
};

export type NullExpression = OnlyOne<{
  exist: true;
  notExist: true;
}>;

export type StringExpression = {
  beginsWith: string;
};
export type StringFilterExpression = OnlyOne<{
  contains: string;
  notContains: string;
}>;

export type CommonExpression<E> = OnlyOne<
  {
    notEqual: E;
  } & NullExpression
>;

export type Filter<E> = {
  [key in keyof E]?: E[key] extends PrimaryPartition<number>
    ?
        | number
        | OnlyOne<
            OperationExpression<number> & CommonExpression<number> & InExpression<number>
          >
    : E[key] extends PrimaryPartition<string>
      ?
          | string
          | OnlyOne<
              StringExpression &
                StringFilterExpression &
                CommonExpression<string> &
                InExpression<string>
            >
      : E[key] extends string | number | boolean | Date | null
        ?
            | E[key]
            | (E[key] extends number
                ? OnlyOne<
                    OperationExpression<number> &
                      CommonExpression<number> &
                      InExpression<number>
                  >
                : E[key] extends boolean
                  ? CommonExpression<boolean>
                  : E[key] extends null
                    ? NullExpression
                    : OnlyOne<
                        StringExpression &
                          StringFilterExpression &
                          CommonExpression<string> &
                          InExpression<string>
                      >)
        : DeepPartial<Filter<E[key]>>;
};

export type OrFilter<E> = {
  OR: Array<Filter<E> | AndFilter<E>>;
};

export type AndFilter<E> = {
  AND: Filter<E> | OrFilter<E>;
};

export type SortDirectionType = 'asc' | 'desc';

export type KeyCondition<E> = {
  partition: Partial<OnlyNumberString<E>>;
  sort?: {
    [key in keyof E as E[key] extends number | string
      ? key
      : never]?: E[key] extends PrimaryPartition<number>
      ? number | OperationExpression<E[key]>
      : E[key] extends PrimaryPartition<string>
        ? string | OnlyOne<OperationExpression<E[key]> & StringExpression>
        :
            | E[key]
            | (E[key] extends number
                ? OperationExpression<E[key]>
                : OnlyOne<OperationExpression<E[key]> | StringExpression>);
  };
};

export type Item<E extends Function> = {
  [key in keyof E['prototype']]: E['prototype'][key];
};

export type Cursor<E extends Function> = Partial<E>;

export type Projection<E extends Function> = KeyOfClass<E>[] | 'ALL';

export interface FindProps<E extends Function> {
  /**
   * Specifies which attributes are included in the query result.
   * By limiting the projected attributes, the response size can be reduced
   * and query performance improved.
   *
   * @example
   * projection: ['foo', 'bar']
   */
  projection?: Projection<E>;
  /**
   * Specifies the filter expression applied to the query or scan operation.
   * This filter is evaluated after the items are read and is used to narrow
   * down the result set based on non-key attributes.
   *
   * @example
   * filter: {
   *   age: {
   *     lessThan: 25,
   *   },
   * }
   */
  filter?: Filter<E['prototype']> | OrFilter<E['prototype']>;
  /**
   * Specifies the sort order to apply to the query results.
   * This determines whether items are returned in ascending or descending order.
   *
   * @example
   *
   * sortDirection: 'asc'
   */
  sortDirection?: SortDirectionType;
  /**
   * Specifies the cursor representing the last item evaluated in a previous query.
   * It is used to resume the query from the same position, allowing subsequent
   * requests to paginate through the query results consistently.
   *
   * @example
   *
   * {
   *   cursor: {
   *     foo: 'some',
   *     bar: 'item'
   *   }
   * }
   */
  cursor?: Cursor<E['prototype']>;
  /**
   * Specifies the maximum number of items to be retrieved by the query.
   * This value limits the size of the result set returned by DynamoDB.
   */
  limit?: number;
  /**
   * Specifies the name of the index to use when executing the query.
   * If not provided, the index that best matches the attributes defined
   * in the key condition will be selected automatically.
   */
  indexName?: string;
}

export interface QueryProps<E extends Function> extends FindProps<E> {
  /**
   * Specifies the key condition used to execute the query.
   * This defines the partition key and, optionally, the sort key
   * that DynamoDB uses to locate the matching items.
   *
   * @example
   * {
   *   keyCondition: {
   *     partition: {
   *       foo: 'value'
   *     },
   *     sort: {
   *       bar: {
   *         lessThan: 10
   *       }
   *     }
   *   }
   * }
   */
  keyCondition: KeyCondition<E['prototype']>;
}

export interface QueryOneProps<E extends Function> extends Omit<QueryProps<E>, 'limit'> {}

export interface QueryResponse<E extends Function> {
  data: E['prototype'][];
  cursor?: Cursor<E['prototype']>;
}

export type ObjectToBoolean<T> = {
  [K in keyof T]?: T[K] extends number | string | boolean | Array<any> | Date
    ? true
    : ObjectToBoolean<T[K]> | true;
};

interface ExistValue<T> {
  ifNotExistValue: T;
}

interface NumericValues<T> extends ExistValue<T> {
  incrementValue?: number;
  decrementValue?: number;
}

export type NumericOrExist<T> = T extends number
  ? number | OnlyOne<NumericValues<T>>
  : T extends string | boolean | Array<any> | Date
    ? T | ExistValue<T>
    : (T & { ifNotExistValue?: never }) | (ExistValue<T> & { [K in keyof T]?: never });

export type ReplaceValue<T> = {
  [K in keyof T]?: NumericOrExist<T[K]>;
};

export type DeepReplaceValue<T> = {
  [K in keyof T]?: T[K] extends number | string | boolean | Array<any> | Date
    ? NumericOrExist<T[K]>
    : ExistValue<T[K]> | DeepReplaceValue<T[K]>;
};

export interface UpdateProps<E extends Function> extends UpsertProps<E> {
  /**
   * Specifies the key condition used to execute the update query.
   * This defines the partition key and, optionally, the sort key
   * that DynamoDB uses to locate the matching items.
   *
   * @example
   * {
   *   keyCondition: {
   *     partition: {
   *       foo: 'value'
   *     },
   *     sort: {
   *       bar: {
   *         lessThan: 10
   *       }
   *     }
   *   }
   * }
   */
  keyCondition: TablePartition<Item<E>>;
  /**
   * Specifies the attribute values to be replaced on the item.
   * Unlike full updates, this allows replacing specific parts
   * of the item without overwriting the entire object.
   *
   * @example
   * {
   *   setValues: {
   *     foo: {
   *       bar: 2 // only replace bar value in foo element
   *     }
   *   }
   * }
   */
  setValues?: DeepReplaceValue<Item<E>>;
  /**
   * Specifies the values to be updated on the item.
   * When a value is an object, the entire object is replaced
   * rather than being merged.
   *
   * @example
   * {
   *   replaceValues: {
   *     foo:  {
   *       bar: 1,
   *       baz: [1, 2, 3]
   *     }
   *   }
   * }
   */
  replaceValues?: ReplaceValue<Item<E>>;
  /**
   * Specifies which attributes should be removed from the item
   * during the update operation.
   *
   * @example
   * {
   *   removeValues: {
   *     foo: true
   *   }
   * }
   */
  removeValues?: ObjectToBoolean<Item<E>>;
  /**
   * Specifies what DynamoDB should return after the update operation completes.
   *
   * - `'all_new'` — Returns all attributes of the item as they appear after the update.
   * - `'updated_new'` — Returns only the attributes that were updated, with their new values.
   * - `'all_old'` — Returns all attributes of the item as they appeared before the update.
   * - `'none'` — Does not return any attribute values.
   *
   * @example
   * {
   *   returnValue: 'all_new'
   * }
   */
  returnValue?: 'all_new' | 'updated_new' | 'all_old' | 'none';
}

export interface UpsertProps<E extends Function> {
  /**
   * Specifies the condition expression used during an item update operation.
   * The update is only executed if the provided condition evaluates to true.
   *
   * condition: {
   *   foo: 'bar'
   * }
   */
  condition?: Filter<E['prototype']>;
}

export interface ModelInformation<E extends ClassResource> {
  modelProps: ModelMetadata<E>;
  partitionKey: string;
  fields: FieldsMetadata;
  sortKey?: string;
}
