import type { ClassResource } from '@alicanto/common';
import type { BucketProps as BucketMainProps } from '../../main';

export interface BucketGlobalConfig
  extends Omit<BucketMainProps, 'name' | 'prefix' | 'tracing'> {}

export interface BucketProps extends BucketGlobalConfig {
  classResource: ClassResource;
}
