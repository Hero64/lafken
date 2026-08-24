import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  getContextValueByScope,
  initLambdaAssetMetadata,
  type ResolverType,
} from '@lafken/resolver';
import { type QueueLambdaMetadata, RESOURCE_TYPE } from '../main';
import { ExternalQueue } from './queue/external/external';
import { InternalQueue } from './queue/internal/internal';

export class QueueResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const contextBundler = getContextValueByScope(module, 'bundler');
    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<QueueLambdaMetadata>(resource);
    initLambdaAssetMetadata({ metadata, handlers, contextBundler });

    for (const handler of handlers) {
      if (handler.isExternal) {
        new ExternalQueue(module, `${metadata.name}-${handler.name}`, {
          resourceMetadata: metadata,
          classResource: resource,
          handler,
        });
        return;
      }

      new InternalQueue(module, `${metadata.name}-${handler.name}`, {
        resourceMetadata: metadata,
        classResource: resource,
        handler,
      });
    }
  }
}
