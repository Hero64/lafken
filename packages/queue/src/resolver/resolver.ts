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
import { Queue } from './queue/queue';

export class QueueResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const minify = getContextValueByScope(module, 'minify');
    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<QueueLambdaMetadata>(resource);
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify ?? minify,
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
    });

    for (const handler of handlers) {
      new Queue(module, `${metadata.name}-${handler.name}`, {
        resourceMetadata: metadata,
        classResource: resource,
        handler,
      });
    }
  }
}
