import 'reflect-metadata';
import {
  createLambdaDecorator,
  createResourceDecorator,
  type LambdaArgumentsType,
  LambdaArgumentTypes,
  LambdaReflectKeys,
} from '@lafken/common';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type { QueueParamMetadata } from '../event/event.types';
import type { FifoProps, QueueLambdaMetadata, StandardProps } from './queue.types';

export const RESOURCE_TYPE = 'QUEUE' as const;

/**
 * Class decorator that registers a class as an SQS queue resource.
 *
 * The decorated class groups one or more consumer handlers (`@Standard`
 * or `@Fifo`) that process messages from SQS queues.
 *
 * @param props - Optional resource configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @Queue()
 * export class NotificationQueue {
 *   @Standard({ batchSize: 5 })
 *   process(@Event(NotificationMessage) msg: NotificationMessage) { }
 * }
 * ```
 */
export const Queue = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

const getValueFromAttribute = (param: QueueParamMetadata, record: SQSRecord) => {
  const value = record.messageAttributes[param.name];
  if (!value) {
    return;
  }

  if (param.type === 'Number') {
    return Number(value.stringValue);
  }

  return value.stringValue;
};

const getValueFormBody = (param: QueueParamMetadata, record: SQSRecord) => {
  const value = record.body;
  if (!value || !param.parse) {
    return value;
  }

  return JSON.parse(String(value))?.[param.name];
};

const argumentParser: Partial<LambdaArgumentsType> = {
  [LambdaArgumentTypes.event]: ({ event, methodName, target }) => {
    const queueEvent: SQSEvent = event;

    const data: any = [];
    const params: Record<string, QueueParamMetadata> =
      Reflect.getMetadata(LambdaReflectKeys.event_param, target) || {};

    const paramsByHandler = params[methodName];

    if (!event || !queueEvent.Records || !paramsByHandler) {
      return event;
    }

    for (const record of queueEvent.Records) {
      const attributes: any = {};
      if (paramsByHandler.type !== 'Object') {
        continue;
      }
      for (const param of paramsByHandler.properties) {
        attributes[param.destinationName] =
          param.source === 'attribute'
            ? getValueFromAttribute(param, record)
            : getValueFormBody(param, record);
      }
      data.push(attributes);
    }

    return data;
  },
};

/**
 * Method decorator that registers a handler as a **standard** SQS queue
 * consumer.
 *
 * The decorated method becomes a Lambda function triggered by messages
 * from a standard (non-FIFO) SQS queue. Configure delivery delay,
 * batch size, visibility timeout, and other queue settings through
 * the decorator props.
 *
 * @param props - Standard queue configuration (deliveryDelay, batchSize,
 *                visibilityTimeout, retentionPeriod, lambda, etc.).
 *
 * @example
 * ```ts
 * @Queue()
 * export class EmailQueue {
 *   @Standard({ batchSize: 10, visibilityTimeout: 60 })
 *   send(@Event(EmailPayload) msg: EmailPayload) { }
 * }
 * ```
 */
export const Standard = createLambdaDecorator<StandardProps, QueueLambdaMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    queueName: props.queueName || methodName,
    name: methodName,
    isFifo: false,
  }),
  argumentParser,
});

/**
 * Method decorator that registers a handler as a **FIFO** SQS queue
 * consumer.
 *
 * The decorated method becomes a Lambda function triggered by messages
 * from a FIFO queue, which guarantees exactly-once processing and
 * strict ordering. In addition to all standard queue options, FIFO
 * queues support `contentBasedDeduplication`.
 *
 * @param props - FIFO queue configuration (contentBasedDeduplication,
 *                batchSize, visibilityTimeout, lambda, etc.).
 *
 * @example
 * ```ts
 * @Queue()
 * export class PaymentQueue {
 *   @Fifo({ contentBasedDeduplication: true, batchSize: 1 })
 *   process(@Event(PaymentMessage) msg: PaymentMessage) { }
 * }
 * ```
 */
export const Fifo = createLambdaDecorator<FifoProps, QueueLambdaMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    queueName: props.queueName || methodName,
    name: methodName,
    isFifo: true,
  }),
  argumentParser,
});
