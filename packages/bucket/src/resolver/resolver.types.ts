import type { BucketProps } from '../main';

export interface BucketGlobalConfig extends Omit<BucketProps, 'name' | 'prefix'> {}
