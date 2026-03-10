import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';

import type { ExtensionsProps, TriggerMetadata, TriggerProps } from './extension.types';

export const RESOURCE_TYPE = 'AUTHENTICATION' as const;

/**
 * Class decorator that registers a class as a Cognito authentication
 * extension resource.
 *
 * The decorated class groups one or more `@Trigger` handlers that
 * respond to Cognito User Pool lifecycle events (e.g. pre sign-up,
 * post confirmation, custom message, etc.).
 *
 * @param props - Optional configuration.
 * @param props.name - A custom name for the resource.
 *
 * @example
 * ```ts
 * @AuthExtension()
 * export class AuthTriggers {
 *   @Trigger({ type: 'preSignUp' })
 *   onPreSignUp(@Event() event) { }
 *
 *   @Trigger({ type: 'postConfirmation' })
 *   onPostConfirmation(@Event() event) { }
 * }
 * ```
 */
export const AuthExtension = (props?: ExtensionsProps) =>
  createResourceDecorator({
    callerFileIndex: 5,
    type: RESOURCE_TYPE,
    getMetadata: (props) => props,
  })(props);

/**
 * Method decorator that registers a handler for a specific Cognito
 * User Pool trigger.
 *
 * Each decorated method becomes a Lambda function that Cognito invokes
 * during the corresponding lifecycle event. Supported trigger types:
 *
 * `preSignUp`, `preAuthentication`, `preTokenGeneration`,
 * `preTokenGenerationConfig`, `userMigration`, `postAuthentication`,
 * `postConfirmation`, `createAuthChallenge`, `defineAuthChallenge`,
 * `customMessage`, `customEmailSender`, `customSmsSender`,
 * `verifyAuthChallengeResponse`.
 *
 * @param props - Trigger configuration.
 * @param props.type - The Cognito trigger type to handle.
 * @param props.lambda - Optional Lambda settings (memory, timeout, etc.).
 *
 * @example
 * ```ts
 * @AuthExtension()
 * export class AuthTriggers {
 *   @Trigger({ type: 'preSignUp' })
 *   validateSignUp(@Event() event) {
 *     // validate and return event
 *   }
 *
 *   @Trigger({ type: 'customMessage', lambda: { memory: 512 } })
 *   customEmail(@Event() event) {
 *     // customize the email message
 *   }
 * }
 * ```
 */
export const Trigger = (props: TriggerProps) =>
  createLambdaDecorator<TriggerProps, TriggerMetadata>({
    getLambdaMetadata: (props, name) => ({
      name,
      ...props,
    }),
  })(props);
