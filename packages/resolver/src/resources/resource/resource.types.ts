import type { Construct } from 'constructs';

export interface DependentResource {
  resolveDependency: (globals: Record<string, Construct>) => void;
  resource: Construct;
}
