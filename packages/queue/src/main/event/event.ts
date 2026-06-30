import {
  createEventDecorator,
  createFieldDecorator,
  createFieldName,
  createPayloadDecorator,
  FieldProperties,
} from '@lafken/common';
import { RESOURCE_TYPE } from '../queue';
import type { ParamProps, QueueParamMetadata } from './event.types';

export const queueFieldKey = createFieldName(RESOURCE_TYPE, FieldProperties.field);
export const queuePayloadKey = createFieldName(RESOURCE_TYPE, FieldProperties.payload);

/**
 * Class decorator that declares a class as an SQS message payload.
 *
 * The decorated class defines the structure of data carried in a queue
 * message. Use `@Param` or `@Field` on its properties to describe
 * where each value is extracted from in the SQS record (message
 * attributes or body).
 *
 * Works both at build time and at Lambda invocation time, so the
 * same class can be used for sending and receiving messages.
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @Payload()
 * export class OrderMessage {
 *   @Param({ source: 'attribute' })
 *   orderId: string;
 *
 *   @Param({ source: 'body', parse: true })
 *   details: OrderDetails;
 * }
 * ```
 */
export const Payload = createPayloadDecorator({
  prefix: RESOURCE_TYPE,
  createUniqueId: false,
  enableInLambdaInvocation: true,
});

/**
 * Property decorator that maps a class field to a value extracted
 * from an SQS message.
 *
 * - `source: 'attribute'` (default) — reads a **message attribute** whose
 *   name matches the property (or the `name` option).
 * - `source: 'body'` — reads from the raw message body string; set
 *   `parse: true` to JSON-parse it and pick the matching key.
 * - `source: 'record'` — reads a top-level SQS record field such as
 *   `messageId`, `receiptHandle`, `awsRegion`, etc. The `name` option
 *   can override which record field is read.
 *
 * @param props - Optional extraction configuration (source, type, parse, name).
 *
 * @example
 * ```ts
 * @Payload()
 * export class NotificationMessage {
 *   @Param({ source: 'attribute', type: String })
 *   userId: string;
 *
 *   @Param({ source: 'body', parse: true })
 *   content: NotificationContent;
 *
 *   @Param({ source: 'record' })
 *   messageId: string;
 *
 *   @Param({ source: 'record', name: 'messageId' })
 *   sqsId: string;
 * }
 * ```
 */
export const Param = createFieldDecorator<ParamProps, QueueParamMetadata>({
  prefix: RESOURCE_TYPE,
  enableInLambdaInvocation: true,
  getMetadata: (props) => {
    const source = props?.source || 'attribute';

    return {
      source,
      parse: props?.source === 'body' && !!props?.parse,
    };
  },
});

/**
 * Property decorator that registers a class field as a generic
 * queue message field.
 *
 * Unlike `@Param`, this decorator does not configure a specific
 * extraction source or parsing behaviour — it simply marks the
 * property for inclusion in the message payload schema.
 *
 * @param props - Optional field configuration (e.g. a custom `name` or `type`).
 *
 * @example
 * ```ts
 * @Payload()
 * export class SimpleMessage {
 *   @Field()
 *   action: string;
 *
 *   @Field()
 *   timestamp: number;
 * }
 * ```
 */
export const Field = createFieldDecorator({
  prefix: RESOURCE_TYPE,
  enableInLambdaInvocation: true,
  getMetadata: () => ({}),
});

/**
 * Parameter decorator that binds the incoming SQS event to a typed
 * payload class on a handler method argument.
 *
 * Pass a class decorated with `@Payload` so the framework can
 * automatically extract and map each field from the raw SQS record
 * into a strongly-typed object at runtime.
 *
 * @param eventField - The payload class describing the expected
 *                      message structure.
 *
 * @example
 * ```ts
 * @Queue()
 * export class OrderQueue {
 *   @Consumer()
 *   process(@Event(OrderMessage) msg: OrderMessage) {
 *     // msg fields are extracted from the SQS record
 *   }
 * }
 * ```
 */
export const Event = (eventField: Function) =>
  createEventDecorator({
    prefix: RESOURCE_TYPE,
    enableInLambdaInvocation: true,
  })(eventField);
