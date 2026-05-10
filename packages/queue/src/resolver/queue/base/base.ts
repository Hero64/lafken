import { LambdaEventSourceMapping } from '@cdktn/provider-aws/lib/lambda-event-source-mapping';
import {
  type FieldTypes,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@lafken/common';
import { LambdaHandler } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { QueueObjectParam, QueueParamMetadata } from '../../../main';
import type { QueueProps } from '../queue.types';

const attributeAllowedTypes = new Set<FieldTypes>(['String', 'Number']);
const bodyUnparsedTypes = new Set<FieldTypes>(['String']);

function getParams(props: QueueProps) {
  const { classResource, handler } = props;
  const params =
    getMetadataPrototypeByKey<Record<string, QueueObjectParam>>(
      classResource,
      LambdaReflectKeys.event_param
    ) || {};
  return params[handler.name];
}

function validateParamType(param: QueueParamMetadata) {
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

type Constructor = new (...args: any[]) => Construct & { arn: string };

export function QueueBase<TBase extends Constructor>(Base: TBase) {
  class QueueWithBase extends Base {
    public addEventSource(id: string, props: QueueProps) {
      const { handler, resourceMetadata } = props;

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
          ? { maximumConcurrency: handler.maxConcurrency }
          : undefined,
        dependsOn: [lambdaHandler],
      });
    }

    public validateEventParams(props: QueueProps) {
      const param = getParams(props);
      if (!param) return;

      let bodyCount = 0;
      for (const property of param.properties) {
        validateParamType(property);
        if (property.source === 'body') bodyCount++;
        if (bodyCount >= 2) throw new Error('Queue event only support one body param');
      }
    }
  }

  return QueueWithBase;
}
