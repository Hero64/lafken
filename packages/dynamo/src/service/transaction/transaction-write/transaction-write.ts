import {
  type TransactWriteItem,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { CreateBuilder } from '../../query-builder/create/create';
import { DeleteBuilder } from '../../query-builder/delete/delete';
import { UpdateBuilder } from '../../query-builder/update/update';
import { UpsertBuilder } from '../../query-builder/upsert/upsert';
import { getTransactionClient } from '../transaction.utils';
import type { QueryTransactions } from './transaction-write.types';

/**
 * Resolves the `TransactWriteItem` operation type for a given query builder.
 *
 * Maps builder instances to their corresponding DynamoDB transactional operation key:
 * - `CreateBuilder` / `UpsertBuilder` → `'Put'`
 * - `UpdateBuilder` → `'Update'`
 * - `DeleteBuilder` → `'Delete'`
 *
 * @param builder - A query builder instance representing one transactional operation.
 * @throws If the builder type is not supported within a transaction.
 * @returns The `TransactWriteItem` key (`'Put'` | `'Update'` | `'Delete'`).
 */
export const getTransactionType = (builder: QueryTransactions) => {
  let type: keyof TransactWriteItem | undefined;

  if (builder instanceof CreateBuilder || builder instanceof UpsertBuilder) {
    type = 'Put';
  } else if (builder instanceof UpdateBuilder) {
    type = 'Update';
  } else if (builder instanceof DeleteBuilder) {
    type = 'Delete';
  }

  if (type === undefined) {
    throw new Error(
      'transactionWrite only accepts put, update, delete and conditionCheck queries.'
    );
  }

  return type;
};

/**
 * Executes multiple write operations atomically using `TransactWriteItemsCommand`.
 *
 * Accepts an array of query builders (`CreateBuilder`, `UpsertBuilder`, `UpdateBuilder`, or
 * `DeleteBuilder`) and groups them into a single transactional request. DynamoDB guarantees
 * all operations either succeed or fail together. Supports up to 100 items per transaction
 * (DynamoDB limit). Does not apply any `ConditionExpression` beyond what each builder already
 * carries; each builder's command is extracted via `getCommand()` and mapped to the appropriate
 * `TransactWriteItem` operation type.
 *
 * The request is sent with the client of the repositories that created the builders, so every
 * builder must share the same client instance: a transaction is a single request and cannot be
 * split across connections. An empty array is a no-op.
 *
 * @param queryBuilders - Array of write builders to include in the transaction.
 * @throws If any builder type is unsupported, if the builders do not share the same client, or
 *   if the transaction is rejected by DynamoDB (e.g. a condition check fails in one of the
 *   items).
 */
export const transactionWrite = async (queryBuilders: QueryTransactions[]) => {
  if (queryBuilders.length === 0) {
    return;
  }

  const client = getTransactionClient(queryBuilders);

  const transactionCommands: TransactWriteItem[] = queryBuilders.map((builder) => {
    return {
      [getTransactionType(builder)]: builder.getCommand(),
    };
  });

  const command = new TransactWriteItemsCommand({
    TransactItems: transactionCommands,
  });

  await client.send(command);
};
