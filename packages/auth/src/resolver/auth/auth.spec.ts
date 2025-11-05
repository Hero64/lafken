import { setupTestingStack } from '@alicanto/resolver';
import 'cdktf/lib/testing/adapters/jest';
import { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';
import { CognitoUserPoolClient } from '@cdktf/provider-aws/lib/cognito-user-pool-client';
import { Testing } from 'cdktf';
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
      lambda_config: {},
      name: 'auth',
    });

    expect(synthesized).toHaveResourceWithProperties(CognitoUserPoolClient, {
      name: 'auth',
    });
  });

  it('should call extend callback', async () => {
    const { stack } = setupTestingStack();
    const extendFn = jest.fn();

    const auth = new Auth(stack, 'auth', {
      name: 'testing-auth',
      extend: extendFn,
    });
    await auth.create();

    await auth.callExtends();

    Testing.synth(stack);

    expect(extendFn).toHaveBeenCalledTimes(1);
  });
});
