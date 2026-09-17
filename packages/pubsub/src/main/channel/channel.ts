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
 * Method decorator that marks a method as the `OnPublish` handler for a
 * `@Channel` namespace. AppSync invokes it directly for every publish
 * request, passing the raw event and expecting the (optionally
 * transformed) events back as the response.
 */
export const OnPublish = createOperationDecorator(ChannelOperation.publish);

/**
 * Method decorator that marks a method as the `OnSubscribe` handler for a
 * `@Channel` namespace. AppSync invokes it directly for every subscribe
 * request; throwing rejects the subscription.
 */
export const OnSubscribe = createOperationDecorator(ChannelOperation.subscribe);
