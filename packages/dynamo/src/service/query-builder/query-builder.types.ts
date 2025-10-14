import 'reflect-metadata';
import type {
  ClassResource,
  DeepPartial,
  KeyOfClass,
  OnlyNumberString,
  OnlyOne,
} from '@alicanto/common';
import type {
  DynamoIndex,
  DynamoModelProps,
  FieldsMetadata,
  ModelPartition,
  PrimaryPartition,
} from '../../main/model';

export interface ModelMetadata<T extends Function>
  extends Required<DynamoModelProps<T>> {}

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
  sort?: OnlyOne<{
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
  }>;
};

export type Item<E extends Function> = {
  [key in keyof E['prototype']]: E['prototype'][key];
};

export type Cursor<E extends Function> = Partial<E>;

export type Projection<E extends Function> = KeyOfClass<E>[] | 'ALL';

export interface FindProps<E extends Function> {
  projection?: Projection<E>;
  filter?: Filter<E['prototype']> | OrFilter<E['prototype']>;
  sortDirection?: SortDirectionType;
  cursor?: Cursor<E['prototype']>;
  limit?: number;
}

export interface QueryProps<E extends Function> extends FindProps<E> {
  keyCondition: KeyCondition<E['prototype']>;
}

export interface QueryOneProps<E extends Function> extends Omit<QueryProps<E>, 'limit'> {}

export interface ExecQueryProps<E extends Function> {
  condition?: string;
  index?: DynamoIndex<E>;
  filter?: string;
  names?: Record<string, string>;
  values?: Record<string, any>;
  limit?: number;
  cursor?: Cursor<E['prototype']>;
  sort?: SortDirectionType;
  projection?: Projection<E>;
}

export interface QueryResponse<E extends Function> {
  data: Partial<E['prototype']>[];
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

export interface UpdateProps<E extends Function> {
  keyCondition: ModelPartition<Item<E>>;
  /**
   * Applies set to internal values, without replacing the entire content.
   */
  setValues?: DeepReplaceValue<Item<E>>;
  /**
   * Replace all content value
   */
  replaceValues?: ReplaceValue<Item<E>>;
  /**
   * Values to remove
   */
  removeValues?: ObjectToBoolean<Item<E>>;
}

export interface UpsertProps<E extends Function> {
  condition?: Filter<E['prototype']>;
}

export interface ModelInformation<E extends ClassResource> {
  modelProps: ModelMetadata<E>;
  partitionKey: string;
  fields: FieldsMetadata;
  sortKey?: string;
}
