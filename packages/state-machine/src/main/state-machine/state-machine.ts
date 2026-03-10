import 'reflect-metadata';
import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';

import {
  type DefaultMethod,
  type HandlerStateProps,
  type LambdaStateMetadata,
  type NestedStateMachineResourceProps,
  type StateMachineBaseProps,
  StateMachineReflectKeys,
  type StateMachineResourceProps,
} from './state-machine.types';

export const RESOURCE_TYPE = 'STATE_MACHINE' as const;

/**
 * Class decorator that registers a class as a **nested** state machine
 * definition.
 *
 * A nested state machine defines a reusable sub-workflow that can be
 * referenced inside a `parallel` branch or a `map` state of a
 * parent `@StateMachine`. It is not deployed as a standalone resource
 * but embedded within the parent definition.
 *
 * @typeParam T - The class being decorated.
 * @param props - State machine definition including `startAt` and
 *                optional `minify`.
 *
 * @example
 * ```ts
 * @NestedStateMachine({
 *   startAt: {
 *     type: 'wait',
 *     seconds: 2,
 *     next: { type: 'succeed' },
 *   },
 * })
 * export class RetryBranch {}
 *
 * @StateMachine({
 *   startAt: {
 *     type: 'parallel',
 *     branches: [RetryBranch],
 *   },
 * })
 * export class OrderFlow {}
 * ```
 */
export const NestedStateMachine =
  <T extends Function>(props: StateMachineBaseProps<keyof T['prototype']>) =>
  (constructor: T) =>
    createResourceDecorator<NestedStateMachineResourceProps<keyof T['prototype']>>({
      type: StateMachineReflectKeys.nested,
      callerFileIndex: 6,
    })(props)(constructor);

/**
 * Class decorator that registers a class as an AWS Step Functions
 * state machine resource.
 *
 * The decorated class defines a complete workflow. Use `@State` on
 * its methods to declare task states backed by Lambda functions or
 * AWS service integrations, and configure the execution flow through
 * the `startAt` option.
 *
 * @typeParam T - The class being decorated.
 * @param props - State machine configuration (startAt, executionType,
 *                services, minify).
 *
 * @example
 * ```ts
 * @StateMachine({ startAt: 'validate' })
 * export class OrderFlow {
 *   @State({ next: 'process' })
 *   validate(@Event(OrderInput) input: OrderInput) {}
 *
 *   @State({ end: true })
 *   process(@Event(OrderInput) input: OrderInput) {}
 * }
 * ```
 *
 * @example
 * ```ts
 * // Declarative flow without Lambda handlers
 * @StateMachine({
 *   startAt: {
 *     type: 'wait',
 *     seconds: 5,
 *     next: { type: 'succeed' },
 *   },
 * })
 * export class DelayedFlow {}
 * ```
 */
export const StateMachine =
  <T extends Function>(props: StateMachineResourceProps<keyof T['prototype']>) =>
  (constructor: T) =>
    createResourceDecorator<StateMachineResourceProps<keyof T['prototype']>>({
      type: RESOURCE_TYPE,
      callerFileIndex: 6,
    })(props)(constructor);

/**
 * Method decorator that registers a handler as a **Task** state inside
 * a `@StateMachine`.
 *
 * The decorated method becomes a Lambda function (or an AWS service
 * integration) that Step Functions invokes as part of the workflow.
 * Use `next` to chain to the following state or `end: true` to mark
 * it as a terminal state. Service integrations are configured via
 * `integrationService`, `action`, and `mode`.
 *
 * @typeParam T - The class that owns the method.
 * @typeParam K - The method key being decorated.
 * @param props - Optional state configuration (next, end, assign,
 *                integrationService, action, mode, lambda, etc.).
 *
 * @example
 * ```ts
 * @StateMachine({ startAt: 'step1' })
 * export class MyFlow {
 *   @State({ next: 'step2', assign: { count: 1 } })
 *   step1(@Event(Input) input: Input) {}
 *
 *   @State({ end: true })
 *   step2(@Event(Input) input: Input) {}
 * }
 * ```
 *
 * @example
 * ```ts
 * // AWS service integration (SQS)
 * @State({ integrationService: 'sqs', action: 'sendMessage', mode: 'token' })
 * send(@IntegrationOptions() { getResourceValue }: GetResourceProps) {
 *   return { QueueUrl: getResourceValue('queue::orders', 'id') };
 * }
 * ```
 */
export const State =
  <T extends Record<K, DefaultMethod>, K extends keyof T>(props?: HandlerStateProps<T>) =>
  (target: T, methodName: K, descriptor: PropertyDescriptor) => {
    return createLambdaDecorator<HandlerStateProps<T>, LambdaStateMetadata<T>>({
      getLambdaMetadata: (props) => ({
        ...props,
        name: methodName as string,
      }),
    })(props)(target, methodName as string, descriptor);
  };
