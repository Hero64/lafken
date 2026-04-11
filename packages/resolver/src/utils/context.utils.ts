import type { Construct } from 'constructs';
import { ContextName, type GlobalContext } from '../types';

export const getAppContext = (scope: Construct): GlobalContext => {
  const context = scope.node.tryGetContext(ContextName.app);
  if (!context) {
    throw new Error('Context not found');
  }

  return context;
};

export const getModuleContext = (scope: Construct): GlobalContext => {
  return scope.node.tryGetContext(ContextName.module);
};

export const getContextValue = <T extends keyof GlobalContext>(
  value: T,
  appContext: GlobalContext,
  moduleContext?: GlobalContext
): GlobalContext[T] => {
  return moduleContext?.[value] || appContext?.[value];
};

export const getContextValueByScope = <T extends keyof GlobalContext>(
  scope: Construct,
  value: T
) => {
  const appContext = getAppContext(scope);
  const moduleContext = getAppContext(scope);

  return getContextValue(value, appContext, moduleContext);
};
