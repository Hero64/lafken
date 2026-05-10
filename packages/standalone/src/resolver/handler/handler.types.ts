import type { ResourceMetadata } from '@lafken/common';
import type { HandlerMetadata } from '../../main';

export interface HandlerProps {
  resourceMetadata: ResourceMetadata;
  handlerMetadata: HandlerMetadata;
}
