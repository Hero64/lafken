import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  getContextValueByScope,
  initLambdaAssetMetadata,
  type ResolverType,
} from '@lafken/resolver';

import {
  type LambdaStateMetadata,
  RESOURCE_TYPE,
  type StateMachineResourceMetadata,
} from '../main';
import { StateMachine } from './state-machine/state-machine';

export class StateMachineResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public async create(module: AppModule, resource: ClassResource) {
    const contextBundler = getContextValueByScope(module, 'bundler');
    const metadata = getResourceMetadata<StateMachineResourceMetadata>(resource);
    const handlers = getResourceHandlerMetadata<LambdaStateMetadata>(resource);

    initLambdaAssetMetadata({ metadata, handlers, contextBundler });

    const stateMachine = new StateMachine(module, metadata.name, {
      minify: metadata.bundler?.minify ?? contextBundler?.minify,
      classResource: resource,
      resourceMetadata: metadata,
      moduleName: module.id,
    });

    await stateMachine.attachDefinition();
  }
}
