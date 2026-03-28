import type { ClassResource } from '@lafken/common';
import type { InternalBucketProps as MainInternalBucketProps } from '../../main';

export interface BucketGlobalConfig
  extends Omit<MainInternalBucketProps, 'name' | 'tracing'> {}

export interface InternalBucketProps extends BucketGlobalConfig {
  classResource: ClassResource;
}

export interface ExternalBucketProps {
  classResource: ClassResource;
}
