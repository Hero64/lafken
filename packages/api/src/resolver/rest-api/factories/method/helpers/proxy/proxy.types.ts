import type { FieldTypes } from '@lafken/common';
import type { ApiParamMetadata } from '../../../../../../main';

interface ValueResolverBase {
  value: any;
  type: FieldTypes;
  field: undefined;
  path: undefined;
}

interface ValueResolverField extends Omit<ValueResolverBase, 'field' | 'path'> {
  path: string;
  field: ApiParamMetadata;
}

export type ProxyValueResolver = ValueResolverBase | ValueResolverField;

export type ProxyResolveObjectKeyValue = ProxyValueResolver & {
  key: string;
};

/**
 * A single piece of a value that mixes static literals with event proxies. When
 * `isProxy` is true, `value` holds the event path (e.g. `file`); otherwise it is
 * verbatim literal text.
 */
export interface ProxySegment {
  isProxy: boolean;
  value: string;
}
