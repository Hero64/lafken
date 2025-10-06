import type { GetResourceValue } from './output.types';
import type {
  ApiAuthorizerNames,
  ApiRestNames,
  AuthNames,
  BucketNames,
  DynamoDbNames,
  EventBusNames,
  QueueScopedNames,
  StateMachineScopedNames,
} from './override-resources.types';

interface EvnFunctionProps {
  getResourceValue: GetResourceValue<
    | DynamoDbNames
    | AuthNames
    | BucketNames
    | ApiRestNames
    | ApiAuthorizerNames
    | EventBusNames
    | DynamoDbNames
    | StateMachineScopedNames
    | QueueScopedNames
  >;
}

type EvnFunction = (props: EvnFunctionProps) => Record<string, string>;

export type EnvironmentValue = Record<string, string> | EvnFunction;
