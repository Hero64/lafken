/**
 * Options for sending a single message to an SQS queue via
 * `QueueService.sendMessage`.
 *
 * @example
 * await QueueService.sendMessage({
 *   url: 'https://sqs.us-east-1.amazonaws.com/123456789/orders',
 *   body: { orderId: 'ord-123', total: 49.99 },
 *   delay: 10,
 * });
 *
 * @example
 * // Send to a FIFO queue
 * await QueueService.sendMessage({
 *   url: 'https://sqs.us-east-1.amazonaws.com/123456789/payments.fifo',
 *   body: { paymentId: 'pay-456', amount: 100 },
 *   groupId: 'customer-789',
 *   deduplicationId: 'pay-456',
 * });
 */
export interface SendMessageProps {
  /**
   * Full SQS queue URL.
   *
   * Identifies the queue the message is sent to, e.g.
   * `https://sqs.us-east-1.amazonaws.com/123456789/my-queue`.
   */
  url: string;

  /**
   * SQS message attributes.
   *
   * Each entry is sent as a message attribute with its `DataType` inferred
   * from the value type: `number` values become `Number` and `string` values
   * become `String`.
   */
  attributes?: Record<string, number | string>;

  /**
   * Message body.
   *
   * Automatically JSON-stringified before sending. Omit to send a message
   * without a body.
   */
  body?: any;

  /**
   * Delay in seconds before the message becomes visible to consumers.
   *
   * Maps to the SQS `DelaySeconds` parameter. Only applies to standard queues
   * (FIFO queues do not support per-message delays).
   */
  delay?: number;

  /**
   * Deduplication ID used to prevent duplicate messages.
   *
   * Only applies to FIFO queues. Required when the queue has
   * content-based deduplication disabled.
   */
  deduplicationId?: string;

  /**
   * Message group ID used to enforce ordered, exactly-once processing.
   *
   * Only applies to FIFO queues. Messages with the same group ID are
   * processed in strict order.
   */
  groupId?: string;
}
