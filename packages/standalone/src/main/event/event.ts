import { LambdaArgumentTypes, reflectArgumentMethod } from '@lafken/common';

/**
 * Parameter decorator that injects the raw invocation payload into a
 * handler method argument.
 *
 * Use it on a parameter of a `@Handler` method so the framework passes
 * the Lambda's incoming event at runtime.
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
