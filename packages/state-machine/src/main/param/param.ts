import {
  type ClassResource,
  createEventDecorator,
  createFieldDecorator,
  createPayloadDecorator,
} from '@alicanto/common';

import type { JsonAtaString, ParamProps, StateMachineParamMetadata } from './param.types';

/**
 * Event decorator.
 *
 * Decorates a function parameter to specify that it will receive an event.
 * The event data can come from either:
 * - A class decorated with `@Payload`, which maps the incoming data to the class structure.
 * - A JSONata expression as a string, allowing dynamic extraction or transformation of the event data.
 */
export const Event = <E extends ClassResource | JsonAtaString>(FieldClass: E) =>
  createEventDecorator()(FieldClass);

export const Payload = createPayloadDecorator({
  createUniqueId: false,
});

export const Param = createFieldDecorator<ParamProps, StateMachineParamMetadata>({
  getMetadata: (props) => props as StateMachineParamMetadata,
});
