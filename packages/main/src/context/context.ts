import type { Construct } from 'constructs';

import type { ContextProps } from './context.types';

export class AppContext {
  constructor(scope: Construct, props: ContextProps) {
    const { contextName, globalConfig = {} } = props;
    const { services: _services, ...contextData } = globalConfig.lambda || {};

    scope.node.setContext(contextName, contextData);
  }
}
