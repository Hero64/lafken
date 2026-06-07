import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  getContextValueByScope,
  lambdaAssets,
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
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      bundler: {
        ...metadata.bundler,
        minify: metadata.bundler?.minify ?? contextBundler?.minify,
      },
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
    });

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
