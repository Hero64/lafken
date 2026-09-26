import { TransactGetItemsCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { GetItemBuilder } from '../../query-builder/get-item/get-item';
import { getTransactionClient } from '../transaction.utils';
import type { QueryGetTransactions, TransactionGetResult } from './transaction-get.types';

/**
 * Reads several items atomically using `TransactGetItemsCommand`.
 *
 * Accepts only `getItem` builders, from any number of tables, and resolves their items in the
 * same order they were requested, with `undefined` for the ones that do not exist. Every item
 * is read from the same consistent snapshot, unlike `batchGet`, which splits the keys into
 * several requests over a single table. Supports up to 100 items per transaction (DynamoDB
 * limit).
 *
 * The request is sent with the client of the repositories that created the builders, so every
 * builder must share the same client instance: a transaction is a single request and cannot be
 * split across connections. An empty array is a no-op.
 *
 * `consistentRead` and `cacheTtl` do not apply here: a transactional read is already strongly
 * consistent, and the in-memory cache is never read nor populated.
 *
 * @param queryBuilders - Array of `getItem` builders to include in the transaction.
 * @throws If any query is not a `getItem`, if the builders do not share the same client, or if
 *   the transaction is rejected by DynamoDB.
 */
export const transactionGet = async <T extends readonly QueryGetTransactions[]>(
  queryBuilders: [...T]
): Promise<TransactionGetResult<T>> => {
  if (queryBuilders.length === 0) {
    return [] as unknown as TransactionGetResult<T>;
  }

  if (queryBuilders.some((builder) => !(builder instanceof GetItemBuilder))) {
    throw new Error('transactionGet only accepts getItem queries.');
  }

  const client = getTransactionClient(queryBuilders);

  const command = new TransactGetItemsCommand({
    TransactItems: queryBuilders.map((builder) => {
      const { TableName, Key, ProjectionExpression, ExpressionAttributeNames } =
        builder.getCommand();

      return {
        Get: { TableName, Key, ProjectionExpression, ExpressionAttributeNames },
      };
    }),
  });

  const { Responses = [] } = await client.send(command);

  return queryBuilders.map((_, index) => {
    const item = Responses[index]?.Item;

    return item ? unmarshall(item) : undefined;
  }) as TransactionGetResult<T>;
};
