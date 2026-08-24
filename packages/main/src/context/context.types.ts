import type { BundlerConfig } from '@lafken/common';
import type { LambdaGlobalConfig } from '@lafken/resolver';

export interface ContextProps {
  globalConfig?: LambdaGlobalConfig;
  contextCreator: string;
  contextName: string;
  bundler?: BundlerConfig;
}
