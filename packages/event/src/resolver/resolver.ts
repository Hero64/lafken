import { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import { DataAwsCloudwatchEventBus } from '@cdktn/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  getContextValueByScope,
  lafkenResource,
  lambdaAssets,
  type ResolverType,
  ResourceOutput,
} from '@lafken/resolver';
import { type EventRuleMetadata, RESOURCE_TYPE } from '../main';
import type {
  BusOutputAttributes,
  EventBusList,
  EventRuleResolverProps,
} from './resolver.types';
import { Rule } from './rule/rule';

const LafkenEventBus = lafkenResource.make(CloudwatchEventBus);
const LafkenDataEventBus = lafkenResource.make(DataAwsCloudwatchEventBus);

export class EventRuleResolver implements ResolverType {
  public type = RESOURCE_TYPE;
  private eventBuses: Record<string, EventBusList> = {};
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

    this.eventBuses.default = {
      eventBus: defaultBus,
    };

    for (const eventBusProps of this.props) {
      if (eventBusProps.busName === 'default') {
        throw new Error('Event bus default already exist');
      }
      let eventBus:
        | InstanceType<typeof LafkenEventBus>
        | InstanceType<typeof LafkenDataEventBus>;

      if (eventBusProps.isExternal) {
        eventBus = new LafkenDataEventBus(scope, `${eventBusProps.busName}-bus`, {
          name: eventBusProps.busName,
        });
      } else {
        eventBus = new LafkenEventBus(scope, `${eventBusProps.busName}-bus`, {
          name: eventBusProps.busName,
        });
        new ResourceOutput<BusOutputAttributes>(eventBus, eventBusProps.outputs);
      }

      eventBus.isGlobal('event-bus', eventBusProps.busName);

      this.eventBuses[eventBusProps.busName] = {
        eventBus: eventBus,
        extend: eventBusProps.extend as EventBusList['extend'],
      };
    }
  }

  public create(module: AppModule, resource: ClassResource) {
    const minify = getContextValueByScope(module, 'minify');

    const metadata: ResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<EventRuleMetadata>(resource);
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify ?? minify,
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
    });

    for (const handler of handlers) {
      const id = `${handler.name}-${metadata.name}`;
      const bus = this.eventBuses[handler.bus || 'default'];
      new Rule(module, id, {
        bus: bus.eventBus,
        handler,
        resourceMetadata: metadata,
      });
    }
  }

  public afterCreate(scope: AppStack) {
    for (const key in this.eventBuses) {
      const { extend, eventBus } = this.eventBuses[key];
      if (!extend) {
        continue;
      }
      extend({
        scope,
        eventBus,
      });
    }
  }
}
