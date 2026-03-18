import type {
  LambdaMetadata,
  LambdaProps,
  QueueNames,
  ResourceOutputType,
} from '@lafken/common';

/**
 * Attributes that can be exported from an SQS queue resource.
 *
 * Based on Terraform `aws_sqs_queue` attribute reference:
 * - `arn`: ARN of the SQS queue.
 * - `id`: URL for the created Amazon SQS queue.
 * - `url`: Same as `id`: the URL for the created Amazon SQS queue.
 */
export type QueueOutputAttributes = 'arn' | 'id' | 'url';

export interface StandardProps {
  /**
   * Delivery delay in seconds.
   *
   * Specifies the amount of time to delay the delivery of a message
   * to the queue after it is sent.
   */
  deliveryDelay?: number;
  /**
   * Maximum message size in bytes.
   *
   * Specifies the limit of message size that the queue can accept.
   * Messages exceeding this size will be rejected.
   */
  maxMessageSizeBytes?: number;
  /**
   * Message retention period in seconds.
   *
   * The duration that messages are kept in the queue before being deleted.
   */
  retentionPeriod?: number;
  /**
   * Visibility timeout in seconds.
   *
   * The duration that a received message is hidden from other consumers
   * while being processed.
   */
  visibilityTimeout?: number;

  /**
   * Maximum number of messages to retrieve in a single batch.
   *
   * Only applicable when consuming messages with a Lambda or batch processor.
   */
  batchSize?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /**
   * Maximum concurrency for Lambda consumers.
   *
   * Specifies the maximum number of Lambda functions that
   * can process messages from the queue concurrently.
   */
  maxConcurrency?: number;

  /**
   * Maximum batching window in seconds.
   *
   * Defines the maximum amount of time to gather messages into a batch
   * before sending them to the consumer.
   */
  maxBatchingWindow?: number;
  /**
   * Lambda configuration for processing messages from this queue.
   */
  lambda?: LambdaProps;
  /**
   * Name of the queue.
   *
   * If not specified, a default name based on the resource or class is used.
   */
  queueName?: QueueNames;
  /**
   * Defines which SQS queue attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_sqs_queue`
   * attribute reference:
   * - `arn`: ARN of the SQS queue.
   * - `id`: URL for the created Amazon SQS queue.
   * - `url`: Same as `id`: the URL for the created Amazon SQS queue.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   outputs: [
   *     { type: 'ssm', name: '/my-app/queue-arn', value: 'arn' },
   *     { type: 'output', name: 'queue_url', value: 'url' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<QueueOutputAttributes>;
}

export interface FifoProps extends StandardProps {
  /**
   * Enable content-based deduplication.
   *
   * Specifies whether the queue should use the content of the message
   * to generate the deduplication ID automatically. This ensures that
   * messages with identical content are treated as duplicates and
   * are not delivered multiple times within the deduplication interval.
   */
  contentBasedDeduplication?: boolean;
}

export interface QueueLambdaMetadata
  extends LambdaMetadata,
    Omit<FifoProps, 'queueName'> {
  queueName: string;
  isFifo: boolean;
}
