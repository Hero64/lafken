import type { ClassResource } from '@lafken/common';
import type { StateMachineResourceMetadata } from '../../main';

export interface StateMachineProps {
  classResource: ClassResource;
  resourceMetadata: StateMachineResourceMetadata;
  moduleName: string;
}
