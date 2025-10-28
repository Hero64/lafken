import type { ResourceMetadata } from '@alicanto/common';
import type { TriggerMetadata } from '../../../../main/extension/extension.types';

export interface ExtensionProps {
  resourceMetadata: ResourceMetadata;
  handlers: TriggerMetadata[];
}
