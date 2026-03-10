import { LambdaArgumentTypes, reflectArgumentMethod } from '@lafken/common';

/**
 * Parameter decorator that injects the raw EventBridge event into a
 * handler method argument.
 *
 * Use it on a parameter of an `@EventHandler` method so the framework
 * passes the incoming EventBridge event payload at runtime.
 *
 * @example
 * ```ts
 * @EventRule({})
 * export class OrderEvents {
 *   @EventHandler({ source: 'orders', detailType: 'order.created' })
 *   onOrderCreated(@Event() event: any) {
 *     // event contains the full EventBridge event payload
 *   }
 * }
 * ```
 */
export const Event = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);
};
