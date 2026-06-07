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
import { type HandlerMetadata, RESOURCE_TYPE } from '../main';
import { Handler } from './handler/handler';

export class StandaloneResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const contextBundler = getContextValueByScope(module, 'bundler');

    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<HandlerMetadata>(resource);
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
      new Handler(module, `${handler.name}-${metadata.name}`, {
        handlerMetadata: handler,
        resourceMetadata: metadata,
      });
    }
  }
}
