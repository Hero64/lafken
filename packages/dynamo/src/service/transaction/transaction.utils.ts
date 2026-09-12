import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { QueryBuilderBase } from '../query-builder/base/base';

/**
 * Resolves the client shared by the queries of a transaction.
 *
 * A transaction is sent as a single request, so it cannot be split across connections: every
 * builder must come from repositories using the same client instance.
 *
 * @param queryBuilders - Non empty list of builders taking part in the transaction.
 * @throws If the builders do not share the same client.
 * @returns The client used to send the transaction.
 */
export const getTransactionClient = (
  queryBuilders: readonly QueryBuilderBase<any>[]
): DynamoDBClient => {
  const client = queryBuilders[0].getClient();

  if (queryBuilders.some((builder) => builder.getClient() !== client)) {
    throw new Error('All queries in a transaction must share the same client');
  }

  return client;
};
