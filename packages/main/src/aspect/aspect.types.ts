import type { EnvironmentValue, VpcConfig } from '@lafken/common';
import type { Construct } from 'constructs';

export interface TaggableResource extends Construct {
  tags?: Record<string, string>;
  tagsInput?: Record<string, string>;
}

export interface AppAspectProps {
  tags?: Record<string, string>;
  environment?: EnvironmentValue;
  vpc?: VpcConfig;
}

export interface OriginalLambdaValue {
  env: Record<string, Record<string, string>>;
  vpcConfig: Record<string, any>;
}
