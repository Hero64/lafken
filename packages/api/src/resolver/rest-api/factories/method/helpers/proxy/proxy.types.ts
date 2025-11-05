import type { FieldTypes } from '@alicanto/common';
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
