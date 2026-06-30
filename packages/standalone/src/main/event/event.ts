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
 * @Standalone({})
 * export class OrderEvents {
 *   @Handler()
 *   lambdaHandler(@Event() event: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export const Event = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);
};
