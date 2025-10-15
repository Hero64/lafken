import type { ResourceMetadata } from '@alicanto/common';
import type { CloudwatchEventBus } from '@cdktf/provider-aws/lib/cloudwatch-event-bus';
import type { EventRuleMetadata } from '../../main';

export interface RuleProps {
  resourceMetadata: ResourceMetadata;
  handler: EventRuleMetadata;
  bus: CloudwatchEventBus;
}
