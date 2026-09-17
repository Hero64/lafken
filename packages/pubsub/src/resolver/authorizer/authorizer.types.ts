import type { ClassResource } from '@lafken/common';

export interface AuthorizerFactoryProps {
  authorizers: ClassResource[];
  defaultAuthorizerName?: string;
}
