import type { GlobalConfig } from '../app/app.types';

export interface ContextProps {
  globalConfig?: GlobalConfig;
  contextName: string;
}
