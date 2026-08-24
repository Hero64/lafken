import {
  type TransactWriteItem,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { client } from '../client/client';
import { CreateBuilder } from '../query-builder/create/create';
import { DeleteBuilder } from '../query-builder/delete/delete';
import { UpdateBuilder } from '../query-builder/update/update';
import { UpsertBuilder } from '../query-builder/upsert/upsert';
import type { QueryTransactions } from './transaction.types';

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
    throw new Error('The transaction includes a query that is not allowed');
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
 * @param queryBuilders - Array of write builders to include in the transaction.
 * @throws If any builder type is unsupported or if the transaction is rejected by DynamoDB
 *   (e.g. a condition check fails in one of the items).
 */
export const transaction = async (queryBuilders: QueryTransactions[]) => {
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
