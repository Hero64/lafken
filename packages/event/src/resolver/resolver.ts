import { CloudwatchEventBus } from '@cdktf/provider-aws/lib/cloudwatch-event-bus';
import { DataAwsCloudwatchEventBus } from '@cdktf/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  lambdaAssets,
  type ResolverType,
} from '@lafken/resolver';
import { type EventRuleMetadata, RESOURCE_TYPE } from '../main';
import type { EventRuleResolverProps } from './resolver.types';
import { Rule } from './rule/rule';

export class EventRuleResolver implements ResolverType {
  public type = RESOURCE_TYPE;
  private eventBuses: Record<string, CloudwatchEventBus> = {};
  private props: EventRuleResolverProps[] = [];

  constructor(...props: EventRuleResolverProps[]) {
    if (props) {
      this.props = props;
    }
  }

  public async beforeCreate(scope: AppStack) {
    const defaultBus = new DataAwsCloudwatchEventBus(scope, 'EventDefaultBus', {
      name: 'default',
    });

    this.eventBuses.default = defaultBus as unknown as CloudwatchEventBus;

    for (const eventBusProps of this.props) {
      if (eventBusProps.busName === 'default') {
        throw new Error('Event bus default already exist');
      }

      this.eventBuses[eventBusProps.busName] = new CloudwatchEventBus(
        scope,
        `${eventBusProps.busName}-bus`,
        {
          name: eventBusProps.busName,
        }
      );
    }
  }

  public create(module: AppModule, resource: ClassResource) {
    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<EventRuleMetadata>(resource);
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify,
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
    });

    for (const handler of handlers) {
      const id = `${handler.name}-${metadata.name}`;
      const bus = this.eventBuses[handler.bus || 'default'];
      new Rule(module, id, {
        bus,
        handler,
        resourceMetadata: metadata,
      });
    }
  }
}
