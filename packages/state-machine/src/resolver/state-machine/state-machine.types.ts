import type { ClassResource } from '@alicanto/common';
import type { Role } from '@alicanto/resolver';
import type { StateMachineResourceMetadata } from '../../main';

export interface StateMachineProps {
  classResource: ClassResource;
  role: Role;
  resourceMetadata: StateMachineResourceMetadata;
}
