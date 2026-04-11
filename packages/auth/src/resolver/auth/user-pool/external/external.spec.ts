import { DataAwsCognitoUserPool } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool';
import { lafkenResource, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { ExternalUserPool } from './external';

describe('ExternalUserPool', () => {
  it('should create an external user pool data source', () => {
    const { stack } = setupTestingStack();

    new ExternalUserPool(stack, 'test', {
      isExternal: true,
      userPoolId: 'us-east-1_abc123',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSource(DataAwsCognitoUserPool);
  });

  it('should create an external user pool with the correct userPoolId', () => {
    const { stack } = setupTestingStack();

    new ExternalUserPool(stack, 'test', {
      isExternal: true,
      userPoolId: 'us-east-1_xyz789',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsCognitoUserPool, {
      user_pool_id: 'us-east-1_xyz789',
    });
  });

  it('should register the user pool as a global resource', () => {
    const { stack } = setupTestingStack();

    const userPool = new ExternalUserPool(stack, 'my-auth', {
      isExternal: true,
      userPoolId: 'us-east-1_abc123',
    });

    const resource = lafkenResource.getResource('user-pool', 'my-auth');

    expect(userPool).toBe(resource);
  });
});
