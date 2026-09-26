import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  getContextValueByScope,
  initLambdaAssetMetadata,
  type ResolverType,
} from '@lafken/resolver';
import {
  type ChannelLambdaMetadata,
  type ChannelResourceMetadata,
  RESOURCE_TYPE,
} from '../main';
import { EventApi, type EventApiOptions } from './event-api';
import { Namespace } from './namespace';

export class PubSubResolver implements ResolverType {
  public type = RESOURCE_TYPE;
  private options: EventApiOptions[];
  private apis: Record<string, EventApi> = {};

  constructor(...options: EventApiOptions[]) {
    this.options = options;
  }

  public beforeCreate(scope: AppStack) {
    if (this.options.length === 0) {
      const id = `${scope.id}-events`;
      this.apis[id] = new EventApi(scope, id, { name: id });
      return;
    }

    for (const option of this.options) {
      this.apis[option.name] = new EventApi(scope, option.name, option);
    }
  }

  public create(module: AppModule, resource: ClassResource) {
    const contextBundler = getContextValueByScope(module, 'bundler');
    const metadata: ChannelResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<ChannelLambdaMetadata>(resource);

    initLambdaAssetMetadata({ metadata, handlers, contextBundler });

    const apiNames = Object.keys(this.apis);
    let api = this.apis[apiNames[0]];

    if (apiNames.length > 1) {
      api = this.apis[metadata.eventApiName as string];

      if (!metadata.eventApiName || !api) {
        throw new Error(
          `Cannot pick an Event API for module "${module.id}": ${apiNames.length} are registered (${apiNames.join(', ')}). Set "eventApiName" on the channel resource to one of them.`
        );
      }
    }

    new Namespace(api, `${metadata.name}-namespace`, {
      resourceMetadata: metadata,
      classResource: resource,
      handlers,
    });
  }
}
