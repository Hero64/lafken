import { getPrimitiveType } from '@lafken/common';
import {
  type DynamoTableProps,
  type FieldProps,
  type FieldsMetadata,
  TableMetadataKeys,
} from './table.types';

/**
 * Class decorator that registers a class as a DynamoDB table resource.
 *
 * The decorated class represents a DynamoDB table and its schema.
 * Use `@PartitionKey`, `@SortKey`, and `@Field` on the class
 * properties to define the table structure. Options such as billing
 * mode, indexes, streams, TTL, and replicas can be set through the
 * decorator props.
 *
 * @typeParam T - The class being decorated.
 * @param props - Optional table configuration. If omitted, the class
 *                name is used as the table name with pay-per-request billing.
 *
 * @example
 * ```ts
 * @Table({ stream: { enabled: true, type: 'NEW_AND_OLD_IMAGES' } })
 * export class UserTable {
 *   @PartitionKey(String)
 *   id: PrimaryPartition<string>;
 *
 *   @SortKey(Number)
 *   createdAt: PrimaryPartition<string>;
 *
 *   @Field()
 *   email: string;
 * }
 * ```
 */
export const Table =
  <T extends Function>(props: DynamoTableProps<T> = {}) =>
  (constructor: T) => {
    const { name = constructor.name, indexes = [], ...dynamoProps } = props;

    Reflect.defineMetadata(
      TableMetadataKeys.table,
      {
        ...dynamoProps,
        name,
        indexes,
      },
      constructor
    );
  };

/**
 * Property decorator that registers a class field as a DynamoDB
 * table attribute.
 *
 * The attribute type is inferred from the property's TypeScript type
 * by default, but can be overridden via the `type` option. Use this
 * decorator for regular attributes that are neither the partition key
 * nor the sort key.
 *
 * @param props - Optional field configuration.
 * @param props.type - Explicit type override (`String`, `Number`, `Boolean`,
 *                     a class, or an array wrapper).
 *
 * @example
 * ```ts
 * @Table()
 * export class OrderTable {
 *   @PartitionKey(String)
 *   id: string;
 *
 *   @Field()
 *   status: string;
 *
 *   @Field({ type: Number })
 *   total: number;
 * }
 * ```
 */
export const Field =
  (props: FieldProps = {}) =>
  (constructor: any, name: string) => {
    const { type: fieldType } = props;

    const fields: FieldsMetadata[] =
      Reflect.getMetadata(TableMetadataKeys.fields, constructor) || {};
    const type = fieldType
      ? getPrimitiveType(fieldType) || 'Object'
      : Reflect.getMetadata('design:type', constructor, name).name;

    Reflect.defineMetadata(
      TableMetadataKeys.fields,
      {
        ...fields,
        [name]: {
          name,
          type,
        },
      },
      constructor
    );
  };

/**
 * Property decorator that marks a field as the DynamoDB table
 * **partition key** (hash key).
 *
 * Every DynamoDB table requires exactly one partition key. The
 * accepted types are `String` or `Number`.
 *
 * Internally registers the field as a regular `@Field` as well,
 * so there is no need to apply both decorators.
 *
 * @param type - The key type (`String` or `Number`).
 *
 * @example
 * ```ts
 * @Table()
 * export class UserTable {
 *   @PartitionKey(String)
 *   id: string;
 * }
 * ```
 */
export const PartitionKey =
  (type: StringConstructor | NumberConstructor) => (constructor: any, name: string) => {
    Field({ type })(constructor, name);
    Reflect.defineMetadata(TableMetadataKeys.partition_key, name, constructor);
  };

/**
 * Property decorator that marks a field as the DynamoDB table
 * **sort key** (range key).
 *
 * A sort key is optional but, when present, works together with
 * the partition key to form a composite primary key. The accepted
 * types are `String` or `Number`.
 *
 * Internally registers the field as a regular `@Field` as well,
 * so there is no need to apply both decorators.
 *
 * @param type - The key type (`String` or `Number`).
 *
 * @example
 * ```ts
 * @Table()
 * export class EventTable {
 *   @PartitionKey(String)
 *   userId: string;
 *
 *   @SortKey(Number)
 *   timestamp: number;
 * }
 * ```
 */
export const SortKey =
  (type: StringConstructor | NumberConstructor) => (constructor: any, name: string) => {
    Field({ type })(constructor, name);
    Reflect.defineMetadata(TableMetadataKeys.sort_key, name, constructor);
  };
