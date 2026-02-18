import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '../../utils';
import { lafkenResource } from './resource';

describe('Lafken resource', () => {
  const Bucket = lafkenResource.make(S3Bucket);
  it('should create lafken resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'test');

    expect(bucket.isGlobal).toBeDefined();
    expect(bucket.isDependent).toBeDefined();
  });

  it('should create a global resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'testing');

    bucket.isGlobal('bucket', 'testing');

    const resourceBucket = lafkenResource.getResource('bucket', 'testing');

    expect(bucket).toBe(resourceBucket);
  });

  it('should create a resource with dependencies', async () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'testing');

    const dependentFn = jest.fn();

    bucket.isDependent(dependentFn);
    await lafkenResource.callDependentCallbacks();

    expect(dependentFn).toHaveBeenCalledTimes(1);
  });
});
