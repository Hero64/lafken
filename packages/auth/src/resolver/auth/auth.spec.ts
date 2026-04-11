import { CognitoUserPool } from '@cdktn/provider-aws/lib/cognito-user-pool';
import { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import { setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';

describe('Auth generation', () => {
  it('should create initial config', async () => {
    const { stack } = setupTestingStack();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
    });

    await auth.create();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      name: 'auth',
    });
  });

  it('should create user pool without user pool client when userClient is not provided', async () => {
    const { stack } = setupTestingStack();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
    });

    await auth.create();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      name: 'auth',
    });
    expect(synthesized).not.toHaveResource(CognitoUserPoolClient);
  });

  it('should create user pool with user pool client when userClient is provided', async () => {
    const { stack } = setupTestingStack();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
      userClient: {},
    });

    await auth.create();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPool, {
      name: 'auth',
    });
    expect(synthesized).toHaveResource(CognitoUserPoolClient);
  });

  it('should call extend callback', async () => {
    const { stack } = setupTestingStack();
    const extendFn = vi.fn();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
      extend: extendFn,
    });
    await auth.create();

    await auth.callExtends();

    Testing.synth(stack);

    expect(extendFn).toHaveBeenCalledTimes(1);
  });

  it('should call extend with undefined userPoolClient when userClient is not provided', async () => {
    const { stack } = setupTestingStack();
    const extendFn = vi.fn();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
      extend: extendFn,
    });
    await auth.create();
    await auth.callExtends();

    Testing.synth(stack);

    expect(extendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        userPoolClient: undefined,
      })
    );
  });
});
