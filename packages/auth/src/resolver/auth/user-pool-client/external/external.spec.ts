import { DataAwsCognitoUserPoolClient } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool-client';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { ExternalUserPoolClient } from './external';

describe('ExternalUserPoolClient', () => {
  it('should create an external user pool client data source', () => {
    const { stack } = setupTestingStack();

    new ExternalUserPoolClient(stack, 'test', {
      isExternal: true,
      clientId: 'abc123clientid',
      userPoolId: 'us-east-1_abc123',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSource(DataAwsCognitoUserPoolClient);
  });

  it('should create an external user pool client with the correct properties', () => {
    const { stack } = setupTestingStack();

    new ExternalUserPoolClient(stack, 'test', {
      isExternal: true,
      clientId: 'abc123clientid',
      userPoolId: 'us-east-1_xyz789',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsCognitoUserPoolClient, {
      client_id: 'abc123clientid',
      user_pool_id: 'us-east-1_xyz789',
    });
  });

  it('should expose the cognito user pool client construct', () => {
    const { stack } = setupTestingStack();

    const externalClient = new ExternalUserPoolClient(stack, 'test', {
      isExternal: true,
      clientId: 'abc123clientid',
      userPoolId: 'us-east-1_abc123',
    });

    expect(externalClient.cognitoUserPoolClient).toBeInstanceOf(
      DataAwsCognitoUserPoolClient
    );
  });
});
