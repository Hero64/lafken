import type { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import type { EventBusNames, ResourceOutputType } from '@lafken/common';
import type { AppStack } from '@lafken/resolver';

export type BusOutputAttributes = 'arn' | 'id';

interface ExtendProps {
  /**
   * The CDKTN application stack scope.
   */
  scope: AppStack;
  /**
   * The underlying CloudWatch Event Bus construct.
   * Use this to apply additional CDKTN configuration beyond what
   * `EventRuleResolverProps` exposes directly.
   */
  eventBus: CloudwatchEventBus;
}

export interface EventRuleResolverProps {
  /**
   * Defines the name of the custom EventBridge event bus to create.
   *
   * The value must match one of the registered `EventBusNames` in your application.
   * The reserved name `'default'` cannot be used here — the default EventBridge bus
   * is always provisioned automatically.
   */
  busName: EventBusNames;
  /**
   * Defines which EventBridge event bus attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_cloudwatch_event_bus`
   * attribute reference:
   * - `arn`: ARN of the event bus.
   * - `id`: Name of the event bus.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   outputs: [
   *     { type: 'ssm', name: '/my-app/orders-bus-arn', value: 'arn' },
   *     { type: 'output', name: 'orders_bus_id', value: 'id' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<BusOutputAttributes>;
  /**
   * Allows extending the event bus with custom configurations or resources.
   *
   * @example
   * {
   *   extend: ({ eventBus, scope }) => {
   *     // Apply additional CDKTN configuration
   *   },
   * }
   */
  extend?: (props: ExtendProps) => void;
}
