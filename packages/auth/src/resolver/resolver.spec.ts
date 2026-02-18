import 'cdktn/lib/testing/adapters/jest';
import { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppModule, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { AuthResolver } from './resolver';

describe('AuthResolver', () => {
  enableBuildEnvVariable();
  it('should create a base auth config', async () => {
    const { stack } = setupTestingStack();
    const resolver = new AuthResolver({
      name: 'test',
    });

    await resolver.beforeCreate(stack as unknown as AppModule);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      name: 'test',
    });

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPoolClient, {
      name: 'test',
    });
  });

  it('should throw error in create hook', async () => {
    const resolver = new AuthResolver({
      name: 'test',
    });

    await expect(async () => {
      await resolver.create();
    }).rejects.toThrow();
  });

  it('should call extend callback in after create', async () => {
    const { stack } = setupTestingStack();
    const extendFn = jest.fn();

    const resolver = new AuthResolver({
      name: 'test',
      extend: extendFn,
    });
    await resolver.beforeCreate(stack as unknown as AppModule);
    await resolver.afterCreate();

    Testing.synth(stack);

    expect(extendFn).toHaveBeenCalledTimes(1);
  });
});
