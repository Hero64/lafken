import type { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import type { EventBusNames } from '@lafken/common';
import type { AppStack } from '@lafken/resolver';

interface ExtendProps {
  scope: AppStack;
  eventBus: CloudwatchEventBus;
}

export interface EventRuleResolverProps {
  busName: EventBusNames;
  extend?: (props: ExtendProps) => void;
}
