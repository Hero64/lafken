import {
  type FieldTypes,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@alicanto/common';
import { type AppModule, alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { LambdaEventSourceMapping } from '@cdktf/provider-aws/lib/lambda-event-source-mapping';
import { SqsQueue } from '@cdktf/provider-aws/lib/sqs-queue';
import type { QueueObjectParam, QueueParamMetadata } from '../../main';
import type { QueueProps } from './queue.types';

const attributeAllowedTypes = new Set<FieldTypes>(['String', 'Number']);
const bodyParsedTypes = new Set<FieldTypes>(['String', 'Object', 'Array']);
const bodyUnparsedTypes = new Set<FieldTypes>(['String']);

export class Queue extends alicantoResource.make(SqsQueue) {
  constructor(
    scope: AppModule,
    id: string,
    private props: QueueProps
  ) {
    const { handler } = props;

    super(scope, `${id}-queue`, {
      name: handler.name,
      fifoQueue: handler.isFifo,
      contentBasedDeduplication: handler.contentBasedDeduplication,
      visibilityTimeoutSeconds: handler.visibilityTimeout,
      messageRetentionSeconds: handler.retentionPeriod,
      maxMessageSize: handler.maxMessageSizeBytes,
      delaySeconds: handler.deliveryDelay,
    });
    this.isGlobal(scope.id);
    this.validateEventParams();
    this.addEventSource();
  }

  private addEventSource() {
    const { handler, resourceMetadata } = this.props;

    /**
     * TODO: verificar si necesita un rol
     */
    const lambdaHandler = new LambdaHandler(this, 'handler', {
      ...handler,
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      suffix: 'queue',
    });

    new LambdaEventSourceMapping(this, 'event-mapping', {
      batchSize: handler.batchSize,
      eventSourceArn: this.arn,
      functionName: lambdaHandler.arn,
      maximumBatchingWindowInSeconds: handler.maxBatchingWindow,
      scalingConfig: handler.maxConcurrency
        ? {
            maximumConcurrency: handler.maxConcurrency,
          }
        : undefined,
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

    if (param.source === 'body' && param.parse && !bodyParsedTypes.has(param.type)) {
      throw new Error(
        `Body params only support ${[...bodyParsedTypes].join(', ')} values`
      );
    }

    if (param?.source === 'body' && !param.parse && !bodyUnparsedTypes.has(param.type)) {
      throw new Error(
        `Body params only support ${[...bodyUnparsedTypes].join(', ')} values`
      );
    }
  }
}
