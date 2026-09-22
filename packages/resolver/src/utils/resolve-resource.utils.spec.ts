import { enableBuildEnvVariable, Refs } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { flushPendingRefs } from './resolve-resource.utils';
import { setupTestingStack } from './testing.utils';

enableBuildEnvVariable();

describe('flushPendingRefs', () => {
  it('is a no-op when nothing was queued', () => {
    expect(() => flushPendingRefs()).not.toThrow();
  });

  it('eagerly materializes queued Refs.* data sources before synth', () => {
    const { stack } = setupTestingStack();

    Refs.ssmValue('/example/flush-test');
    Refs.accountId();
    Refs.callerArn();
    Refs.region();
    Refs.partition();
    Refs.dnsSuffix();

    flushPendingRefs();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('aws_ssm_parameter');
    expect(synthesized).toContain('aws_caller_identity');
    expect(synthesized).toContain('aws_region');
    expect(synthesized).toContain('aws_partition');
  });
});
