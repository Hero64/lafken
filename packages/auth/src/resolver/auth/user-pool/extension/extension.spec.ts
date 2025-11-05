import 'cdktf/lib/testing/adapters/jest';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@alicanto/common';
import { LambdaHandler, setupTestingStack } from '@alicanto/resolver';
import { Testing } from 'cdktf';
import { AuthExtension, Trigger } from '../../../../main/extension/extension';
import type { TriggerMetadata } from '../../../../main/extension/extension.types';
import { Extension } from './extension';

jest.mock('@alicanto/resolver', () => {
  const actual = jest.requireActual('@alicanto/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      invokeArn: 'invokeArn',
    })),
  };
});

describe('User pool extension', () => {
  enableBuildEnvVariable();

  @AuthExtension()
  class UserPoolExtensions {
    @Trigger({
      type: 'customEmailSender',
    })
    emailSender() {}

    @Trigger({
      type: 'preSignUp',
    })
    preSignUp() {}
  }

  it('should create lambda config triggers', () => {
    const { stack } = setupTestingStack();
    const metadata = getResourceMetadata(UserPoolExtensions);
    const handlers = getResourceHandlerMetadata<TriggerMetadata>(UserPoolExtensions);

    const extension = new Extension(stack, 'test', {
      handlers,
      resourceMetadata: metadata,
    });

    const triggers = extension.createTriggers();
    Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledTimes(2);

    expect(triggers).toStrictEqual({
      customEmailSender: { lambdaArn: 'test-function', lambdaVersion: 'V1_0' },
      preSignUp: 'test-function',
    });
  });
});
