import type { ClassResource } from '@lafken/common';
import type { GetItemBuilder } from '../../query-builder/get-item/get-item';

export type QueryGetTransactions = GetItemBuilder<any>;

/**
 * Maps a tuple of `getItem` builders to the tuple of items they resolve.
 *
 * Keeps the result typed by position, so builders from different models do not collapse into
 * a single union: `[userRepository.getItem(...), orderRepository.getItem(...)]` resolves as
 * `[User | undefined, Order | undefined]`.
 */
export type TransactionGetResult<T extends readonly QueryGetTransactions[]> = {
  [K in keyof T]: T[K] extends GetItemBuilder<infer E extends ClassResource>
    ? InstanceType<E> | undefined
    : never;
};
