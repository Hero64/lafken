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
import { type EventCronMetadata, RESOURCE_TYPE } from '../main';
import { Cron } from './cron/cron';

export class ScheduleResolver implements ResolverType {
  public type = RESOURCE_TYPE;

  public create(module: AppModule, resource: ClassResource) {
    const contextBundler = getContextValueByScope(module, 'bundler');

    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<EventCronMetadata>(resource);
    initLambdaAssetMetadata({ metadata, handlers, contextBundler });

    for (const handler of handlers) {
      const id = `${handler.name}-${metadata.name}`;
      new Cron(module, id, {
        handler,
        resourceMetadata: metadata,
      });
    }
  }
}
