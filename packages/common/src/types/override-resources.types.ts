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
export type BucketReferenceNames = ResourceScopeKeys<SharedReferenceResources, 'bucket'>;

export type DynamoTableNames = ResourceScopeKeys<SharedResourceNames, 'dynamo'>;
export type DynamoReferenceNames = ResourceScopeKeys<SharedReferenceResources, 'dynamo'>;

export type StateMachineNames = ResourceScopeKeys<SharedResourceNames, 'state-machine'>;
export type StateMachineReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'state-machine'
>;

export type EventBusNames = ResourceScopeKeys<SharedResourceNames, 'event-bus'>;
export type EventBusReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'event-bus'
>;

export type EventRuleReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'event-rule'
>;

export type QueueNames = ResourceScopeKeys<SharedResourceNames, 'queue'>;
export type QueueReferenceNames = ResourceScopeKeys<SharedReferenceResources, 'queue'>;

export type UserPoolNames = ResourceScopeKeys<SharedResourceNames, 'user-pool'>;
export type UserPoolReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'user-pool'
>;

export type UserPoolClientNames = ResourceScopeKeys<
  SharedResourceNames,
  'user-pool-client'
>;
export type UserPoolClientReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'user-pool-client'
>;

export type ApiAuthorizerNames = ResourceScopeKeys<SharedResourceNames, 'api-authorizer'>;

export type ScheduleReferenceNames = ResourceScopeKeys<
  SharedReferenceResources,
  'schedule'
>;

export type LambdaNames = ResourceScopeKeys<SharedResourceNames, 'lambda'>;
export type LambdaReferenceNames = ResourceScopeKeys<SharedReferenceResources, 'lambda'>;

export type RegisterNamespaces =
  | 'api'
  | 'bucket'
  | 'dynamo'
  | 'state-machine'
  | 'queue'
  | 'authentication'
  | 'api-authorizer'
  | 'user-pool'
  | 'user-pool-client'
  | 'schedule'
  | 'event-bus'
  | 'event-rule'
  | 'lambda'
  | (string & {});
