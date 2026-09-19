import type { Services, ServicesName } from '@lafken/common';
import type { Construct } from 'constructs';

export type ServiceRoleName = `${ServicesName}.${'read' | 'write' | 'delete'}`;

export interface CreateRoleProps {
  scope: Construct;
  name: string;
  service: Services;
  additionalServices?: Services[];
}
