import type { ServicesName } from '@alicanto/common';
import type { ResolveResources } from '@alicanto/resolver';
import type { IntegrationOptionBase } from '../../../../../main';

export type ServiceRoleName = `${ServicesName}.${'read' | 'write' | 'delete'}`;

export interface IntegrationOption {
  resolveResource: ResolveResources;
  options: IntegrationOptionBase;
}
