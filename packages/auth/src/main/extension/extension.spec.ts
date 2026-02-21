import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { AuthExtension, Trigger } from './extension';
import type { TriggerMetadata } from './extension.types';

describe('Extension decorator', () => {
  enableBuildEnvVariable();

  @AuthExtension()
  class CognitoExtensions {
    @Trigger({
      type: 'preSignUp',
    })
    preSignUp() {}
  }

  it('should exist resource metadata', () => {
    const resourceMetadata = getResourceMetadata(CognitoExtensions);

    expect(resourceMetadata).toBeDefined();
    expect(resourceMetadata.name).toBe('CognitoExtensions');
  });

  it('should exist trigger metadata', () => {
    const triggersMetadata =
      getResourceHandlerMetadata<TriggerMetadata>(CognitoExtensions);

    expect(triggersMetadata).toBeDefined();
    expect(triggersMetadata).toHaveLength(1);
    expect(triggersMetadata[0].type).toBe('preSignUp');
  });
});
