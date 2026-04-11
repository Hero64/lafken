import type { LambdaGlobalConfig } from '@lafken/resolver';

export interface ContextProps {
  globalConfig?: LambdaGlobalConfig;
  contextCreator: string;
  contextName: string;
  minify?: boolean;
}
