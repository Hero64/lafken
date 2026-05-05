import { LambdaEventSourceMapping } from '@cdktn/provider-aws/lib/lambda-event-source-mapping';
import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { SqsQueueRedrivePolicy } from '@cdktn/provider-aws/lib/sqs-queue-redrive-policy';
import {
  type FieldTypes,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@lafken/common';
import {
  type AppModule,
  LambdaHandler,
  lafkenResource,
  ResourceOutput,
} from '@lafken/resolver';
import type {
  QueueObjectParam,
  QueueOutputAttributes,
  QueueParamMetadata,
} from '../../main';
import type { QueueProps } from './queue.types';
import { sqsName } from './queue.utils';

const attributeAllowedTypes = new Set<FieldTypes>(['String', 'Number']);
const bodyParsedTypes = new Set<FieldTypes>(['String', 'Object', 'Array']);
const bodyUnparsedTypes = new Set<FieldTypes>(['String']);

export class Queue extends lafkenResource.make(SqsQueue) {
  constructor(
    scope: AppModule,
    id: string,
    private props: QueueProps
  ) {
    const { handler } = props;

    super(scope, `${id}-queue`, {
      name: sqsName(handler.queueName, handler.isFifo ? '.fifo' : ''),
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
    this.validateEventParams();
    this.addEventSource(id);
    new ResourceOutput<QueueOutputAttributes>(this, handler.outputs);
  }

  private addDeadLetterQueue(id: string) {
    const { handler } = this.props;
    if (!handler.dlq) return;

    const dlqName = sqsName(handler.queueName, `-dlq${handler.isFifo ? '.fifo' : ''}`);

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

  private addEventSource(id: string) {
    const { handler, resourceMetadata } = this.props;

    const lambdaHandler = new LambdaHandler(this, `${id}-handler`, {
      ...handler,
      originalName: resourceMetadata.originalName,
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      suffix: 'queue',
    });

    new LambdaEventSourceMapping(this, 'event-mapping', {
      batchSize: handler.batchSize,
      eventSourceArn: this.arn,
      functionName: lambdaHandler.arn,
      maximumBatchingWindowInSeconds: handler.maxBatchingWindow,
      functionResponseTypes: handler.isFifo ? ['ReportBatchItemFailures'] : undefined,
      scalingConfig: handler.maxConcurrency
        ? {
            maximumConcurrency: handler.maxConcurrency,
          }
        : undefined,
      dependsOn: [lambdaHandler, this],
    });
  }

  private validateEventParams() {
    const param = this.getParams();
    if (!param) {
      return;
    }

    let bodyCount = 0;
    for (const property of param.properties) {
      this.validateParamType(property);

      if (property.source === 'body') {
        bodyCount++;
      }
      if (bodyCount >= 2) {
        throw new Error('Queue event only support one body param');
      }
    }
  }

  private getParams() {
    const { classResource, handler } = this.props;

    const params =
      getMetadataPrototypeByKey<Record<string, QueueObjectParam>>(
        classResource,
        LambdaReflectKeys.event_param
      ) || {};

    return params[handler.name];
  }

  private validateParamType(param: QueueParamMetadata) {
    if (param.source === 'attribute' && !attributeAllowedTypes.has(param.type)) {
      throw new Error(
        `Attribute params only support ${[...attributeAllowedTypes].join(', ')} values`
      );
    }

    if (param?.source === 'body' && !param.parse && !bodyUnparsedTypes.has(param.type)) {
      throw new Error(
        `Body params only support ${[...bodyUnparsedTypes].join(', ')} values`
      );
    }
  }
}
