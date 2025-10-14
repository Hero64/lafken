import type { DynamoModelProps } from '../main';

export interface DynamoGlobalConfig
  extends Pick<DynamoModelProps<any>, 'removalPolicy'> {}
