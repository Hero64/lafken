import type { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import type { DataAwsCloudwatchEventBus } from '@cdktn/provider-aws/lib/data-aws-cloudwatch-event-bus';
import type {
  EventBusNames,
  EventBusReferenceNames,
  ResourceOutputType,
} from '@lafken/common';
import type { AppStack } from '@lafken/resolver';

export type BusOutputAttributes = 'arn' | 'id';

interface ExtendProps<T> {
  /**
   * The CDKTN application stack scope.
   */
  scope: AppStack;
  /**
   * The underlying CloudWatch Event Bus construct.
   * Use this to apply additional CDKTN configuration beyond what
   * `EventRuleResolverProps` exposes directly.
   */
  eventBus: T;
}

export interface EventBusList {
  eventBus: CloudwatchEventBus | DataAwsCloudwatchEventBus;
  extend?: (props: ExtendProps<CloudwatchEventBus | DataAwsCloudwatchEventBus>) => void;
}

export interface EventRuleResolverBaseProps {
  /**
   * Defines the name of the custom EventBridge event bus to create.
   *
   * The value must match one of the registered `EventBusNames` in your application.
   * The reserved name `'default'` cannot be used here — the default EventBridge bus
   * is always provisioned automatically.
   */
  busName: EventBusNames;

  /**
   * Registers this Event bus as a named global reference, allowing other resources
   * to access its attributes (e.g. execution ARN) by reference name.
   *
   * @example
   * // Register the API under a reference name
   * ref: 'event-bus'
   */
  ref?: EventBusReferenceNames;
}

export interface InternalEventRuleResolverProps extends EventRuleResolverBaseProps {
  isExternal?: never;
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
  extend?: (props: ExtendProps<CloudwatchEventBus>) => void;
}

export interface ExternalEventRuleResolverProps extends EventRuleResolverBaseProps {
  /**
   * Marks the EventBridge event bus as an external resource.
   *
   * When set to `true`, the event bus is not created by the framework.
   * Instead, it references an existing EventBridge event bus using the provided `busName`.
   */
  isExternal: true;
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
  extend?: (props: ExtendProps<DataAwsCloudwatchEventBus>) => void;
}

export type EventRuleResolverProps =
  | InternalEventRuleResolverProps
  | ExternalEventRuleResolverProps;
