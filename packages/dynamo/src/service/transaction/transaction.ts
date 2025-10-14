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
