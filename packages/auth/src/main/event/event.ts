import { createEventDecorator } from '@lafken/common';
import { RESOURCE_TYPE } from '../extension/extension';

/**
 * Parameter decorator that binds the incoming Cognito trigger event
 * to a handler method argument.
 *
 * Use it on a `@Trigger` handler parameter so the framework
 * automatically injects the raw Cognito event object at runtime.
 *
 * @example
 * ```ts
 * @AuthExtension()
 * export class AuthTriggers {
 *   @Trigger({ type: 'preSignUp' })
 *   onPreSignUp(@Event() event: PreSignUpTriggerEvent) {
 *     // event contains the Cognito trigger payload
 *   }
 * }
 * ```
 */
export const Event = () => createEventDecorator({ prefix: RESOURCE_TYPE })(class {});
