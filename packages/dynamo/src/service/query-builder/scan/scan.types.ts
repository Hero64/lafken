import type { ClassResource } from '@alicanto/common';

import type { QueryBuilderProps } from '../base/base.types';
import type { FindProps } from '../query-builder.types';

export interface ScanBuilderProps<E extends ClassResource> extends QueryBuilderProps<E> {
  inputProps: FindProps<E>;
}
