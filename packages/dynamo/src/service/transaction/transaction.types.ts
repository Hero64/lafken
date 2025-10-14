import type { CreateBuilder } from '../query-builder/create/create';
import type { DeleteBuilder } from '../query-builder/delete/delete';
import type { UpdateBuilder } from '../query-builder/update/update';
import type { UpsertBuilder } from '../query-builder/upsert/upsert';

export type QueryTransactions =
  | CreateBuilder<any>
  | UpsertBuilder<any>
  | UpdateBuilder<any>
  | DeleteBuilder<any>;
