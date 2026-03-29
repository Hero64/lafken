import type { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import type { DataAwsCloudwatchEventBus } from '@cdktn/provider-aws/lib/data-aws-cloudwatch-event-bus';
import type { ResourceMetadata } from '@lafken/common';
import type { EventRuleMetadata } from '../../main';

export interface RuleProps {
  resourceMetadata: ResourceMetadata;
  handler: EventRuleMetadata;
  bus: CloudwatchEventBus | DataAwsCloudwatchEventBus;
}
