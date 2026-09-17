import { LambdaArgumentTypes, reflectArgumentMethod } from '@lafken/common';

/**
 * Parameter decorator that injects the raw AppSync Events invocation event
 * (the `DIRECT` handler payload for `OnPublish`/`OnSubscribe`) into a
 * handler method argument.
 *
 * @example
 * ```ts
 * @Channel({})
 * export class ChatChannel {
 *   @OnPublish()
 *   onMessage(@Event() event: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export const Event = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);
};

/**
 * Parameter decorator that injects the Lambda invocation context into a
 * handler method argument.
 */
export const Context = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.context);
};
