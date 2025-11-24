import type { ResourceMetadata } from '@alicanto/common';
import type { EventCronMetadata } from '../../main';

export interface CronProps {
  resourceMetadata: ResourceMetadata;
  handler: EventCronMetadata;
}
