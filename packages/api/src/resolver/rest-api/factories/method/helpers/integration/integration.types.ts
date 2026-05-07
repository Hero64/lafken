import type { Services, ServicesName, ServicesValues } from '@lafken/common';
import type { ResolveResources } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { IntegrationOptionBase } from '../../../../../../main';

export type ServiceRoleName = `${ServicesName}.${'read' | 'write' | 'delete'}`;

export interface IntegrationOption {
  resolveResource: ResolveResources;
  options: IntegrationOptionBase;
}

export interface CreateRoleProps {
  scope: Construct;
  name: string;
  service: Services;
  additionalServices?: ServicesValues;
}
