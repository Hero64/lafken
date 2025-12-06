import {
  Api,
  Delete,
  type DynamoDeleteIntegrationResponse,
  type DynamoIntegrationOption,
  type DynamoPutIntegrationResponse,
  type DynamoQueryIntegrationResponse,
  Event,
  Get,
  IntegrationOptions,
  Post,
} from '@alicanto/api/main';
import type { Client } from '../../model/client.model';
import { DynamoPkEvent, DynamoPutEvent } from './greeting.field';

@Api({
  path: 'dynamo',
})
export class DynamoIntegration {
  @Get({
    integration: 'dynamodb',
    action: 'Query',
  })
  query(
    @Event(DynamoPkEvent) e: DynamoPkEvent,
    @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption
  ): DynamoQueryIntegrationResponse<Client> {
    return {
      partitionKey: {
        email: e.email,
      },
      sortKey: {
        name: e.name,
      },
      tableName: getResourceValue('clients', 'id'),
    };
  }

  @Post({
    integration: 'dynamodb',
    action: 'Put',
  })
  put(
    @Event(DynamoPutEvent) e: DynamoPutEvent,
    @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption
  ): DynamoPutIntegrationResponse<Client> {
    return {
      tableName: getResourceValue('clients', 'id'),
      data: {
        age: e.age,
        email: e.email,
        name: e.name,
        expireAt: 1000000,
      },
    };
  }

  @Delete({
    integration: 'dynamodb',
    action: 'Delete',
  })
  remove(
    @Event(DynamoPkEvent) e: DynamoPkEvent,
    @IntegrationOptions() { getResourceValue }: DynamoIntegrationOption
  ): DynamoDeleteIntegrationResponse<Client> {
    return {
      tableName: getResourceValue('clients', 'id'),
      partitionKey: {
        email: e.email,
      },
      sortKey: {
        name: e.name,
      },
    };
  }
}
