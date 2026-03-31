import type { Construct } from 'constructs';

import type { ContextProps } from './context.types';

export class AppContext {
  constructor(scope: Construct, props: ContextProps) {
    const { contextName, globalConfig = {} } = props;
    const {
      services: _services,
      vpcConfig: _vpcConfig,
      env: _env,
      ...contextData
    } = globalConfig || {};

    scope.node.setContext(contextName, {
      ...contextData,
      contextCreator: props.contextCreator,
    });
  }
}
