import type { ClassResource, ResourceMetadata } from '@lafken/common';
import type { QueueLambdaMetadata } from '../../main';

export interface InternalQueueProps {
  handler: QueueLambdaMetadata;
  resourceMetadata: ResourceMetadata;
  classResource: ClassResource;
}

export interface ExternalQueueProps {
  handler: QueueLambdaMetadata;
  resourceMetadata: ResourceMetadata;
  classResource: ClassResource;
}

export type QueueProps = InternalQueueProps | ExternalQueueProps;
