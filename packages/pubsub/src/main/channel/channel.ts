import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';
import {
  type ChannelLambdaMetadata,
  ChannelOperation,
  type ChannelProps,
  RESOURCE_TYPE,
} from './channel.types';

export { RESOURCE_TYPE } from './channel.types';

/**
 * Class decorator that declares an AppSync Events channel namespace.
 *
 * Use `@OnPublish`/`@OnSubscribe` on methods of the decorated class to
 * process published events or authorize/filter subscription requests.
 *
 * @example
 * ```ts
 * @Channel({ namespace: 'chat' })
 * export class ChatChannel {
 *   @OnPublish()
 *   onMessage(@Event() event: any) {
 *     return event.events;
 *   }
 * }
 * ```
 */
export const Channel = createResourceDecorator<ChannelProps>({ type: RESOURCE_TYPE });

const createOperationDecorator = (operation: ChannelOperation) =>
  createLambdaDecorator<Record<string, never>, ChannelLambdaMetadata>({
    getLambdaMetadata: (_props, methodName) => ({ name: methodName, operation }),
  });

/**
 * A `REQUEST_RESPONSE` Direct Lambda integration has no VTL/JS layer to
 * reshape the response (unlike API Gateway), so AWS AppSync Events requires
 * the Lambda itself to return `{ events: OutgoingEvent[] }` — a bare array
 * is rejected with `DependencyFailedException`. This wraps the handler's
 * return value to match that contract while keeping the ergonomic
 * `@OnPublish` signature: return nothing to keep events unchanged, `null`
 * to drop them, or an array to replace them.
 */
const wrapPublishResponse = (descriptor: PropertyDescriptor) => {
  const handler = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const result = await handler.apply(this, args);

    if (result === null) {
      return { events: [] };
    }

    if (result === undefined) {
      return { events: args[0]?.events };
    }

    return { events: result };
  };
};

const publishLambdaDecorator = createOperationDecorator(ChannelOperation.publish);

/**
 * Method decorator that marks a method as the `OnPublish` handler for a
 * `@Channel` namespace. AppSync invokes it directly for every publish
 * request, passing the raw event and expecting the (optionally
 * transformed) events back as the response.
 */
export const OnPublish =
  (props?: Record<string, never>) =>
  (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    publishLambdaDecorator(props)(target, methodName, descriptor);
    wrapPublishResponse(descriptor);
  };

/**
 * Method decorator that marks a method as the `OnSubscribe` handler for a
 * `@Channel` namespace. AppSync invokes it directly for every subscribe
 * request; throwing rejects the subscription.
 */
export const OnSubscribe = createOperationDecorator(ChannelOperation.subscribe);
