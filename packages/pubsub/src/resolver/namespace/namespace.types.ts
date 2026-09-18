import type { ClassResource } from '@lafken/common';
import type { ChannelLambdaMetadata, ChannelResourceMetadata } from '../../main';

export interface NamespaceProps {
  resourceMetadata: ChannelResourceMetadata;
  classResource: ClassResource;
  handlers: ChannelLambdaMetadata[];
}
