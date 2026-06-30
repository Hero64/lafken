import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { SqsQueueRedrivePolicy } from '@cdktn/provider-aws/lib/sqs-queue-redrive-policy';
import { type AppModule, lafkenResource, ResourceOutput } from '@lafken/resolver';
import type { QueueOutputAttributes } from '../../../main';
import { QueueBase } from '../base/base';
import type { QueueProps } from '../queue.types';
import { sqsName } from '../queue.utils';

export class InternalQueue extends QueueBase(lafkenResource.make(SqsQueue)) {
  constructor(
    scope: AppModule,
    id: string,
    private props: QueueProps
  ) {
    const { handler } = props;

    super(scope, `${id}-queue`, {
      name: sqsName(handler.queueName as string, handler.isFifo ? '.fifo' : ''),
      fifoQueue: handler.isFifo,
      contentBasedDeduplication: handler.contentBasedDeduplication,
      visibilityTimeoutSeconds: handler.visibilityTimeout,
      messageRetentionSeconds: handler.retentionPeriod,
      maxMessageSize: handler.maxMessageSizeBytes,
      delaySeconds: handler.deliveryDelay,
    });

    if (handler.ref) {
      this.register('queue', handler.ref);
    }

    this.addDeadLetterQueue(id);
    this.validateEventParams(props);
    this.addEventSource(id, props);
    new ResourceOutput<QueueOutputAttributes>(this, handler.outputs);
  }

  private addDeadLetterQueue(id: string) {
    const { handler } = this.props;
    if (!handler.dlq) return;

    const dlqName = sqsName(
      handler.queueName as string,
      `-dlq${handler.isFifo ? '.fifo' : ''}`
    );

    const dlq = new SqsQueue(this, `${id}-dlq`, {
      name: dlqName,
      fifoQueue: handler.isFifo,
      messageRetentionSeconds: handler.dlq.retentionPeriod,
    });

    new SqsQueueRedrivePolicy(this, `${id}-redrive-policy`, {
      queueUrl: this.url,
      redrivePolicy: JSON.stringify({
        deadLetterTargetArn: dlq.arn,
        maxReceiveCount: handler.dlq.maxReceiveCount,
      }),
    });
  }
}
