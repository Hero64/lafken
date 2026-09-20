import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { enableBuildEnvVariable, Refs } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupTestingStack } from '../../utils';
import { lafkenResource } from './resource';

enableBuildEnvVariable();

describe('Lafken resource', () => {
  const Bucket = lafkenResource.make(S3Bucket);
  it('should create lafken resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'test');

    expect(bucket.register).toBeDefined();
  });

  it('should create a global resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'testing');

    bucket.register('bucket', 'testing');

    const resourceBucket = lafkenResource.getResource('bucket', 'testing');

    expect(bucket).toBe(resourceBucket);
  });

  it('should resolve a Refs.resourceValue() reference embedded directly in the config, without a callback', () => {
    const { stack } = setupTestingStack();

    const source = new Bucket(stack, 'source', {});
    source.register('bucket', 'source');

    new Bucket(stack, 'target', {
      bucket: Refs.resourceValue('bucket::source', 'id'),
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('aws_s3_bucket.source.id');
  });

  it('should resolve a Refs.resourceValue() reference even when the target resource is created later', () => {
    const { stack } = setupTestingStack();

    new Bucket(stack, 'target', {
      bucket: Refs.resourceValue('bucket::later', 'id'),
    });

    const source = new Bucket(stack, 'later', {});
    source.register('bucket', 'later');

    expect(() => Testing.synth(stack)).not.toThrow();
  });

  it('should throw at synth time when a Refs.resourceValue() reference never resolves', () => {
    const { stack } = setupTestingStack();

    new Bucket(stack, 'target', {
      bucket: Refs.resourceValue('bucket::missing', 'id'),
    });

    expect(() => Testing.synth(stack)).toThrow();
  });

  it('should throw at synth time when the referenced property does not exist on the resource', () => {
    const { stack } = setupTestingStack();

    const source = new Bucket(stack, 'source', {});
    source.register('bucket', 'source');

    new Bucket(stack, 'target', {
      bucket: Refs.resourceValue('bucket::source', 'notAnAttribute' as any),
    });

    expect(() => Testing.synth(stack)).toThrow(/notAnAttribute/);
  });

  it('should resolve a Refs.ssmValue() reference embedded directly in the config', () => {
    const { stack } = setupTestingStack();

    new Bucket(stack, 'target', {
      bucket: Refs.ssmValue('/example/bucket-name'),
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('data.aws_ssm_parameter');
  });

  it('should resolve a reference nested inside an object/array property', () => {
    const { stack } = setupTestingStack();

    const source = new Bucket(stack, 'source', {});
    source.register('bucket', 'source');

    new Bucket(stack, 'target', {
      bucket: 'plain-name',
      tags: {
        sourceId: Refs.resourceValue('bucket::source', 'id'),
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('"bucket": "plain-name"');
    expect(synthesized).toContain('aws_s3_bucket.source.id');
  });

  it('should resolve Refs.fn/Refs.token/Refs.accountId() embedded directly in the config', () => {
    const { stack } = setupTestingStack();

    new Bucket(stack, 'target', {
      bucket: Refs.fn.upper('hello'),
      tags: {
        account: Refs.accountId(),
        wasResolved: String(Refs.token.isUnresolved(Refs.accountId())),
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('data.aws_caller_identity');
    expect(synthesized).toContain('upper(');
  });

  it('should resolve Refs.callerArn()/Refs.region()/Refs.partition()/Refs.dnsSuffix() embedded directly in the config', () => {
    const { stack } = setupTestingStack();

    new Bucket(stack, 'target', {
      bucket: 'plain-name',
      tags: {
        callerArn: Refs.callerArn(),
        region: Refs.region(),
        partition: Refs.partition(),
        dnsSuffix: Refs.dnsSuffix(),
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toContain('data.aws_caller_identity');
    expect(synthesized).toContain('data.aws_region');
    expect(synthesized).toContain('data.aws_partition');
  });
});
