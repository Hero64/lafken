import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { ClassResource } from '@lafken/common';
import type { TablePartition } from '../../main';
import type {
  FindProps,
  Item,
  QueryOneProps,
  QueryProps,
  ReturnValueOption,
  UpdateProps,
  UpsertProps,
} from '../query-builder';
import type { BatchGetBuilder } from '../query-builder/batch-get/batch-get';
import type { BatchGetOptions } from '../query-builder/batch-get/batch-get.types';
import type { BulkCreateBuilder } from '../query-builder/bulk-create/bulk-create';
import type { BulkDeleteBuilder } from '../query-builder/bulk-delete/bulk-delete';
import type { CreateBuilder } from '../query-builder/create/create';
import type { DeleteBuilder } from '../query-builder/delete/delete';
import type { FindAllBuilder } from '../query-builder/find-all/find-all';
import type { FindOneBuilder } from '../query-builder/find-one/find-one';
import type { GetItemBuilder } from '../query-builder/get-item/get-item';
import type { GetItemOptions } from '../query-builder/get-item/get-item.types';
import type { ScanBuilder } from '../query-builder/scan/scan';
import type { UpdateBuilder } from '../query-builder/update/update';
import type { UpsertBuilder } from '../query-builder/upsert/upsert';

export type RepositoryReturn<E extends ClassResource> = {
  /**
   * Queries a single item using `QueryCommand`.
   *
   * Builds a `KeyConditionExpression` from `keyCondition` and automatically resolves the
   * secondary index (GSI/LSI) to use when applicable. Optionally applies a `FilterExpression`
   * on the results and enforces `Limit: 1`. If `cacheTtl` is provided, the result is stored
   * in the in-memory cache keyed by table name and `inputProps`.
   *
   * @param inputProps - Query conditions: `keyCondition`, `filter`, `projection`, `cursor`, `limit`, `sortDirection`.
   * @param cacheTtl - In-memory cache TTL in seconds. If omitted, no caching is applied.
   * @returns Thenable builder that resolves with the first matching item or `undefined`.
   */
  findOne(inputProps: QueryOneProps<E>, cacheTtl?: number): FindOneBuilder<E>;
  /**
   * Queries multiple items using `QueryCommand`.
   *
   * Builds a `KeyConditionExpression` from `keyCondition` and automatically resolves the
   * secondary index (GSI/LSI) to use when applicable. Optionally applies a `FilterExpression`,
   * pagination via `ExclusiveStartKey` (cursor), `Limit`, `ProjectionExpression`, and sort
   * direction. Automatically paginates until all results are retrieved. If `cacheTtl` is
   * provided, the result is stored in the in-memory cache.
   *
   * @param inputProps - Query conditions: `keyCondition`, `filter`, `projection`, `cursor`, `limit`, `sortDirection`.
   * @param cacheTtl - In-memory cache TTL in seconds. If omitted, no caching is applied.
   * @returns Thenable builder that resolves with `{ data, cursor }`.
   */
  findAll(inputProps: QueryProps<E>, cacheTtl?: number): FindAllBuilder<E>;
  /**
   * Scans the entire table using `ScanCommand`.
   *
   * Unlike `findAll`, does not require a `keyCondition` and reads every item in the table.
   * Optionally applies a `FilterExpression`, pagination via `ExclusiveStartKey` (cursor),
   * `Limit`, and `ProjectionExpression`. Automatically paginates until the requested limit is
   * reached. **Avoid on large tables due to high read capacity consumption.**
   *
   * @param inputProps - Optional parameters: `filter`, `projection`, `cursor`, `limit`.
   * @returns Thenable builder that resolves with `{ data, cursor }`.
   */
  scan(inputProps?: FindProps<E>): ScanBuilder<E>;
  /**
   * Creates or replaces an item using `PutItemCommand`.
   *
   * If an item with the same primary key already exists, it is fully overwritten.
   * Optionally accepts a `ConditionExpression` via `inputProps.condition` to guard the write
   * (e.g. verify an attribute has a specific value before writing).
   *
   * @param item - The full item to write to the table.
   * @param inputProps - Optional parameters: `condition` for `ConditionExpression`.
   * @returns Thenable builder that resolves with the written item.
   */
  upsert(item: Item<E>, inputProps?: UpsertProps<E>): UpsertBuilder<E>;
  /**
   * Creates a new item using `PutItemCommand`, ensuring it does not already exist.
   *
   * Internally adds an automatic `ConditionExpression` using `attribute_not_exists` on the
   * partition key (and sort key if present), causing the operation to fail if the item already
   * exists. Does not accept additional conditions.
   *
   * @param item - The item to create. Throws a DynamoDB error if the item already exists.
   * @returns Thenable builder that resolves with the created item.
   */
  create(item: Item<E>): CreateBuilder<E>;
  /**
   * Updates attributes of an existing item using `UpdateItemCommand`.
   *
   * Builds an `UpdateExpression` with `SET` clauses (for `setValues` and `replaceValues`) and
   * `REMOVE` clauses (for `removeValues`). The difference between `setValues` and `replaceValues`
   * is that `setValues` performs a deep merge on nested objects, while `replaceValues` overwrites
   * the attribute entirely. Optionally applies a `ConditionExpression` via `condition` and returns
   * previous or new attributes when `returnValue` is specified.
   *
   * @param inputProps - `keyCondition` (primary key of the item to update), `setValues`,
   *   `replaceValues`, `removeValues`, `condition` for `ConditionExpression`, and `returnValue`
   *   (`'all_old'` | `'all_new'` | `'updated_old'` | `'updated_new'`).
   * @returns Thenable builder that resolves with the updated item if `returnValue` was specified, or `undefined`.
   */
  update<R extends ReturnValueOption | undefined = undefined>(
    inputProps: Omit<UpdateProps<E>, 'returnValue'> & { returnValue?: R }
  ): UpdateBuilder<E, R>;
  /**
   * Fetches a single item by its exact primary key using `GetItemCommand`.
   *
   * Unlike `findOne`, uses `GetItemCommand` instead of `QueryCommand`, making it more efficient
   * for exact-key lookups. Supports `ConsistentRead` for strongly consistent reads and
   * `ProjectionExpression` to return only specific attributes. If `cacheTtl` is provided,
   * the result is stored in the in-memory cache.
   *
   * @param key - Primary key of the item (partition key and sort key if applicable).
   * @param options - Options: `consistentRead`, `projection`, `cacheTtl` for in-memory caching.
   * @returns Thenable builder that resolves with the found item or `undefined`.
   */
  getItem(key: TablePartition<Item<E>>, options?: GetItemOptions<E>): GetItemBuilder<E>;
  /**
   * Deletes an item by its primary key using `DeleteItemCommand`.
   *
   * Does not apply any `ConditionExpression`. If the item does not exist, the operation
   * completes without error.
   *
   * @param key - Primary key of the item to delete (partition key and sort key if applicable).
   * @returns Thenable builder that resolves with `true` on completion.
   */
  delete(key: TablePartition<Item<E>>): DeleteBuilder<E>;
  /**
   * Fetches multiple items by their primary keys using `BatchGetItemCommand`.
   *
   * Automatically splits keys into batches of up to 100 items (DynamoDB limit) and executes
   * all batches in parallel. Automatically retries `UnprocessedKeys` up to `maxAttempt` times
   * (default 5). Supports `ConsistentRead` and `ProjectionExpression`.
   *
   * @param keys - List of primary keys to retrieve.
   * @param options - Options: `consistentRead`, `projection`, `maxAttempt` (default: 5).
   * @returns Thenable builder that resolves with the array of found items.
   */
  batchGet(
    keys: TablePartition<Item<E>>[],
    options?: BatchGetOptions<E>
  ): BatchGetBuilder<E>;
  /**
   * Creates multiple items using `BatchWriteItemCommand` with `PutRequest`.
   *
   * Automatically splits items into batches of up to 25 (DynamoDB limit) and sends them in
   * parallel. Automatically retries `UnprocessedItems` up to `maxAttempt` times (default 5).
   * Does not apply a `ConditionExpression`; if an item already exists, it is overwritten.
   *
   * @param items - List of items to write to the table.
   * @returns Thenable builder that resolves when all writes are complete.
   */
  bulkCreate(items: Item<E>[]): BulkCreateBuilder<E>;
  /**
   * Deletes multiple items using `BatchWriteItemCommand` with `DeleteRequest`.
   *
   * Automatically splits keys into batches of up to 25 (DynamoDB limit) and sends them in
   * parallel. Automatically retries `UnprocessedItems` up to `maxAttempt` times (default 5).
   * If a key does not exist, the operation completes without error.
   *
   * @param keys - List of primary keys of the items to delete.
   * @returns Thenable builder that resolves when all deletions are complete.
   */
  bulkDelete(keys: TablePartition<Item<E>>[]): BulkDeleteBuilder<E>;
  /**
   * Sends an arbitrary command directly to the DynamoDB client.
   *
   * Allows executing SDK commands not covered by the repository methods.
   *
   * @param command - Any DynamoDB SDK command (`@aws-sdk/client-dynamodb`).
   * @returns Promise that resolves with the typed command response.
   */
  sendRawCommand<T = unknown>(command: Parameters<DynamoDBClient['send']>[0]): Promise<T>;
  /**
   * Clears the in-memory cache shared by `findOne`, `findAll`, and `getItem`.
   *
   * All cached results are invalidated immediately. Useful after write operations that may
   * leave stale data in the cache.
   */
  clearCache(): void;
};
