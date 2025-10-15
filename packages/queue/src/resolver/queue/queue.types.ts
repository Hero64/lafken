import type { ClassResource, ResourceMetadata } from '@alicanto/common';
import type { QueueLambdaMetadata } from '../../main';

export interface QueueProps {
  handler: QueueLambdaMetadata;
  resourceMetadata: ResourceMetadata;
  classResource: ClassResource;
}
