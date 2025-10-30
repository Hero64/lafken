import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '../../utils';
import { alicantoResource } from './resource';

describe('Alicanto resource', () => {
  it('should create alicanto resource', () => {
    const { stack } = setupTestingStack();

    const bucket = alicantoResource.create('bucket', S3Bucket, stack, 'testing');

    expect(bucket.isGlobal).toBeDefined();
    expect(bucket.isDependent).toBeDefined();
  });

  it('should create a global resource', () => {
    const { stack } = setupTestingStack();

    const bucket = alicantoResource.create('bucket', S3Bucket, stack, 'testing');

    bucket.isGlobal();

    const resourceBucket = alicantoResource.getResource('bucket-testing');

    expect(bucket).toBe(resourceBucket);
  });

  it('should create a resource with dependencies', async () => {
    const { stack } = setupTestingStack();

    const bucket = alicantoResource.create('bucket', S3Bucket, stack, 'testing');

    const dependentFn = jest.fn();

    bucket.isDependent(dependentFn);
    await alicantoResource.callDependentCallbacks();

    expect(dependentFn).toHaveBeenCalledTimes(1);
  });
});
