import {
  type ClassResource,
  Context,
  createEventDecorator,
  createFieldDecorator,
  createFieldName,
  createPayloadDecorator,
  FieldProperties,
} from '@lafken/common';
import { RESOURCE_TYPE } from '../state-machine';
import type { JsonAtaString, ParamProps, StateMachineParamMetadata } from './param.types';

export const stateMachineFieldKey = createFieldName(RESOURCE_TYPE, FieldProperties.field);
export const stateMachinePayloadKey = createFieldName(
  RESOURCE_TYPE,
  FieldProperties.payload
);

/**
 * Parameter decorator that binds the incoming Step Functions state
 * input to a handler method argument.
 *
 * The event data can come from either:
 * - A class decorated with `@Payload`, which maps the incoming data
 *   to a typed class structure.
 * - A JSONata expression string (`{%...%}`), allowing dynamic
 *   extraction or transformation of the event data.
 *
 * @typeParam E - A `@Payload` class or a JSONata string.
 * @param FieldClass - The payload class or JSONata expression that
 *                     describes how to extract the event data.
 *
 * @example
 * ```ts
 * @StateMachine()
 * export class OrderFlow {
 *   @Task()
 *   validate(@Event(OrderInput) input: OrderInput) { }
 *
 *   @Task()
 *   transform(@Event('{%$states.input.orderId%}') id: string) { }
 * }
 * ```
 */
export const Event = <E extends ClassResource | JsonAtaString>(FieldClass: E) =>
  createEventDecorator({ prefix: RESOURCE_TYPE })(FieldClass);

/**
 * Class decorator that declares a class as a Step Functions state
 * input/output payload.
 *
 * The decorated class defines the shape of the data passed between
 * states. Use `@Param` on its properties to describe where each value
 * is extracted from (execution context, state input, custom value, etc.).
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @Payload()
 * export class OrderInput {
 *   @Param({ context: 'input', source: 'orderId' })
 *   orderId: string;
 *
 *   @Param({ context: 'execution', source: 'id' })
 *   executionId: string;
 * }
 * ```
 */
export const Payload = createPayloadDecorator({
  prefix: RESOURCE_TYPE,
  createUniqueId: false,
});

/**
 * Parameter decorator that injects the integration options
 *
 * Use it to receive a `GetResourceProps` object (or custom integration
 * parameters) that provides access to `getResourceValue`, allowing you
 * to reference other infrastructure resources (queues, buckets, tables,
 * etc.) when building the integration payload returned by the handler.
 *
 * @example
 * ```ts
 * @StateMachine({ startAt: 'send' })
 * export class OrderFlow {
 *   @State({ integrationService: 'sqs', action: 'sendMessage', mode: 'token' })
 *   send(@IntegrationOptions() { getResourceValue }: GetResourceProps) {
 *     return {
 *       QueueUrl: getResourceValue('queue::orders', 'id'),
 *       MessageBody: { message: 'new order' },
 *     };
 *   }
 * }
 * ```
 */
export const IntegrationOptions = Context;

/**
 * Property decorator that maps a class field to a value extracted from
 * the Step Functions execution context.
 *
 * Use it inside a `@Payload` class to specify which context or source
 * provides the value for the field. Supported contexts include:
 * `input`, `execution`, `state`, `state_machine`, `task`, `custom`,
 * and `jsonata`.
 *
 * @param props - Extraction configuration (context, source/value, optional
 *                name and type overrides).
 *
 * @example
 * ```ts
 * @Payload()
 * export class TaskInput {
 *   @Param({ context: 'input', source: 'userId' })
 *   userId: string;
 *
 *   @Param({ context: 'execution', source: 'start_time' })
 *   startedAt: string;
 *
 *   @Param({ context: 'custom', value: 'pending' })
 *   status: string;
 * }
 * ```
 */
export const Param = createFieldDecorator<ParamProps, StateMachineParamMetadata>({
  prefix: RESOURCE_TYPE,
  getMetadata: (props) => props as StateMachineParamMetadata,
});
