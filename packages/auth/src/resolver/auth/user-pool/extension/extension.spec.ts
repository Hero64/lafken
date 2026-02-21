import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { LambdaHandler, setupTestingStack } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { AuthExtension, Trigger } from '../../../../main/extension/extension';
import type { TriggerMetadata } from '../../../../main/extension/extension.types';
import { Extension } from './extension';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
      this.invokeArn = 'invokeArn';
    }),
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
