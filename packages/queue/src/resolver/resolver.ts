import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@alicanto/common';
import { type AppModule, lambdaAssets, type ResolverType } from '@alicanto/resolver';
import { type QueueLambdaMetadata, RESOURCE_TYPE } from '../main';
import { Queue } from './queue/queue';

export class QueueResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<QueueLambdaMetadata>(resource);
    lambdaAssets.initializeMetadata({
      pathName: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify,
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
