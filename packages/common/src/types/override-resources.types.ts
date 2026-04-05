import type { ResourceIdentifiers, ScopedResourceNames } from './utilities.types';

export type ModuleGlobalReferenceNames =
  | 'api'
  | 'auth'
  | 'bucket'
  | 'dynamo'
  | 'event-bus';

export interface ModulesAvailable {}
export interface AuthAvailable {}
export interface BucketAvailable {}
export interface ApiRestAvailable {}
export interface ApiAuthorizerAvailable {}
export interface EventBusAvailable {}
export interface DynamoTableAvailable {}

type ResourceNames<T> = keyof T | (string & {});
type StackResourceName<T, S extends ModuleGlobalReferenceNames> =
  | `${S}::${Extract<keyof T, string | number>}`
  | (string & {});

export type ModuleNames = ResourceNames<ModulesAvailable>;
export type AuthNames = ResourceNames<AuthAvailable>;
export type AuthScopedNames = StackResourceName<AuthAvailable, 'auth'>;
export type BucketNames = ResourceNames<BucketAvailable>;
export type BucketScopedNames = StackResourceName<BucketAvailable, 'bucket'>;
export type ApiRestNames = ResourceNames<ApiRestAvailable>;
export type ApiRestScopedNames = StackResourceName<ApiRestAvailable, 'api'>;
export type ApiAuthorizerNames = ResourceNames<ApiAuthorizerAvailable>;
export type EventBusNames = ResourceNames<EventBusAvailable>;
export type EventBusScopedNames = StackResourceName<EventBusAvailable, 'event-bus'>;
export type DynamoTableNames = ResourceNames<DynamoTableAvailable>;
export type DynamoTableScopedNames = StackResourceName<DynamoTableAvailable, 'dynamo'>;

export type StateMachineNames =
  | ResourceIdentifiers<ModulesAvailable, 'StateMachine'>
  | (string & {});
export type StateMachineScopedNames =
  | ScopedResourceNames<ModulesAvailable, 'StateMachine', 'state-machine'>
  | (string & {});

export type QueueNames = ResourceIdentifiers<ModulesAvailable, 'Queue'> | (string & {});
export type QueueScopedNames =
  | ScopedResourceNames<ModulesAvailable, 'Queue', 'queue'>
  | (string & {});
