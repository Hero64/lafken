import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  getContextValueByScope,
  lambdaAssets,
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

    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
      bundler: {
        ...metadata.bundler,
        minify: metadata.bundler?.minify ?? contextBundler?.minify,
      },
    });

    const stateMachine = new StateMachine(module, metadata.name, {
      minify: metadata.bundler?.minify ?? contextBundler?.minify,
      classResource: resource,
      resourceMetadata: metadata,
      moduleName: module.id,
    });

    await stateMachine.attachDefinition();
  }
}
