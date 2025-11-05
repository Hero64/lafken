import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '../../utils';
import { alicantoResource } from './resource';

describe('Alicanto resource', () => {
  const Bucket = alicantoResource.make(S3Bucket);
  it('should create alicanto resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'test');

    expect(bucket.isGlobal).toBeDefined();
    expect(bucket.isDependent).toBeDefined();
  });

  it('should create a global resource', () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'testing');

    bucket.isGlobal('bucket');

    const resourceBucket = alicantoResource.getResource('bucket-testing');

    expect(bucket).toBe(resourceBucket);
  });

  it('should create a resource with dependencies', async () => {
    const { stack } = setupTestingStack();

    const bucket = new Bucket(stack, 'testing');

    const dependentFn = jest.fn();

    bucket.isDependent(dependentFn);
    await alicantoResource.callDependentCallbacks();

    expect(dependentFn).toHaveBeenCalledTimes(1);
  });
});
