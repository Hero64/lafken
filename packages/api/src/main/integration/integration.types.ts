import type {
  BucketNames,
  DynamoDbScopedNames,
  GetResourceValue,
  OnlyNumberString,
  OnlyOne,
  QueueNames,
  StateMachineScopedNames,
} from '@alicanto/common';

export interface IntegrationOptionBase<T = string> {
  getResourceValue: GetResourceValue<T>;
  getCurrentDate: () => string;
}

export interface BucketIntegrationResponse {
  bucket: string;
  object: string;
}

export type BucketIntegrationOption = IntegrationOptionBase<BucketNames>;

export interface StateMachineStartIntegrationResponse<T = any> {
  stateMachineArn: string;
  input: T;
}

export interface StateMachineStatusIntegrationResponse {
  stateMachineArn: string;
  executionId: string;
}

export interface StateMachineStopIntegrationResponse
  extends StateMachineStatusIntegrationResponse {}

export type StateMachineIntegrationOption =
  IntegrationOptionBase<StateMachineScopedNames>;

export type DynamoIntegrationOption = IntegrationOptionBase<DynamoDbScopedNames>;

interface DynamoIntegrationBase {
  tableName: string;
}

interface DynamoIntegrationPartitionBase<T = any> extends DynamoIntegrationBase {
  partitionKey: OnlyOne<OnlyNumberString<Required<T>>>;
  sortKey?: Partial<OnlyOne<OnlyNumberString<Required<T>>>>;
}

export interface DynamoQueryIntegrationResponse<T = any>
  extends DynamoIntegrationPartitionBase<T> {
  indexName?: string;
}

export interface DynamoPutIntegrationResponse<T = any> extends DynamoIntegrationBase {
  data: T;
  validateExistKeys?:
    | [keyof OnlyNumberString<Required<T>>, keyof OnlyNumberString<Required<T>>]
    | [keyof OnlyNumberString<Required<T>>];
}

export type QueueIntegrationOptionBase = IntegrationOptionBase<QueueNames>;

export interface DynamoDeleteIntegrationResponse<T = any>
  extends DynamoIntegrationPartitionBase<T> {}

export interface QueueSendMessageIntegrationResponse {
  queueUrl: string;
  attributes?: Partial<Record<string, string | number>>;
  body?: any;
}
