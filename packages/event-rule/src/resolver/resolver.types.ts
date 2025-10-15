import type { EventBusNames } from '@alicanto/common';
import type { AppStack } from '@alicanto/resolver';
import type { CloudwatchEventBus } from '@cdktf/provider-aws/lib/cloudwatch-event-bus';

interface ExtendProps {
  scope: AppStack;
  eventBus: CloudwatchEventBus;
}

export interface EventRuleResolverProps {
  busName: EventBusNames;
  extend?: (props: ExtendProps) => void;
}
