export interface SharedResourceNames {}
export interface SharedReferenceResources {}

export type ResourceScopedKeys<T> = {
  [Scope in keyof T]: `${Scope & string}::${T[Scope] & string}`;
}[keyof T];

export type ResourceScopeKeys<T, Scope extends string> =
  T extends Record<Scope, string> ? T[Scope] : string & {};

export type AvailableReference = [keyof SharedReferenceResources] extends [never]
  ? string
  : ResourceScopedKeys<SharedReferenceResources>;

export type ApiNames = ResourceScopeKeys<SharedResourceNames, 'api'>;
export type ApiReferenceNames = ResourceScopeKeys<SharedReferenceResources, 'api'>;

export type BucketNames = ResourceScopeKeys<SharedResourceNames, 'bucket'>;
export type DynamoTableNames = ResourceScopeKeys<SharedResourceNames, 'dynamo'>;
export type StateMachineNames = ResourceScopeKeys<SharedResourceNames, 'state-machine'>;
export type EventBusNames = ResourceScopeKeys<SharedResourceNames, 'event-bus'>;
export type QueueNames = ResourceScopeKeys<SharedResourceNames, 'queue'>;
export type AuthNames = ResourceScopeKeys<SharedResourceNames, 'authentication'>;
export type ApiAuthorizerNames = ResourceScopeKeys<SharedResourceNames, 'api-authorizer'>;

export type RegisterNamespaces =
  | 'api'
  | 'bucket'
  | 'dynamo'
  | 'state-machine'
  | 'queue'
  | 'authentication'
  | 'api-authorizer'
  | (string & {});
