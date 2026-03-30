import type { GetResourceValue } from './output.types';
import type {
  ApiRestScopedNames,
  AuthScopedNames,
  BucketScopedNames,
  DynamoTableScopedNames,
  EventBusScopedNames,
  QueueScopedNames,
  StateMachineScopedNames,
} from './override-resources.types';

export interface ClassResource {
  new (...args: any[]): {};
}

export interface GetResourceProps {
  getResourceValue: GetResourceValue<
    | DynamoTableScopedNames
    | AuthScopedNames
    | BucketScopedNames
    | ApiRestScopedNames
    | EventBusScopedNames
    | StateMachineScopedNames
    | QueueScopedNames
  >;
  getSSMValue: (value: string, secure?: boolean) => string;
}
