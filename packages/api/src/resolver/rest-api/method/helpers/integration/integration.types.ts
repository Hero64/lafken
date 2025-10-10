import type { ServicesName } from '@alicanto/common';

export type ServiceRoleName = `${ServicesName}.${'read' | 'write' | 'delete'}`;
