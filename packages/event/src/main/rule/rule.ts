import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';
import type { EventRuleMetadata, EventRuleProps } from './rule.types';

export const RESOURCE_TYPE = 'EVENT' as const;

/**
 * Class decorator that registers a class as an EventBridge rule resource.
 *
 * The decorated class groups one or more `@Rule` handler methods that
 * react to events published on an EventBridge bus. Each handler inside
 * the class defines its own event pattern and integration.
 *
 * @param props - Optional resource configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @EventRule()
 * export class OrderEvents {
 *   @Rule({ pattern: { source: 'orders', detailType: ['order.created'] } })
 *   onCreated(@Event() event) { }
 * }
 * ```
 */
export const EventRule = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

/**
 * Method decorator that registers a handler for a specific EventBridge
 * rule pattern.
 *
 * The decorated method becomes a Lambda function that is invoked when
 * an event matching the configured pattern is published on the
 * EventBridge bus. Supports default custom events, S3 events, and
 * DynamoDB stream events through the `integration` option.
 *
 * @param props - Rule configuration including the event pattern, optional
 *                integration source, retry attempts, max event age, and bus name.
 *
 * @example
 * ```ts
 * // Custom event
 * @Rule({
 *   pattern: { source: 'payments', detailType: ['payment.completed'] },
 * })
 * onPayment(@Event() event) { }
 *
 * // S3 integration
 * @Rule({
 *   integration: 's3',
 *   pattern: { detailType: ['Object Created'], detail: { bucket: { name: ['uploads'] } } },
 * })
 * onUpload(@Event() event) { }
 * ```
 */
export const Rule = (props: EventRuleProps) =>
  createLambdaDecorator<EventRuleProps, EventRuleMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
      eventType: 'rule',
    }),
  })(props);
