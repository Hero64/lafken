import 'cdktf/lib/testing/adapters/jest';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '../../utils';
import { alicantoResource } from '../resource';
import { Environment } from './environment';

describe('Environment', () => {
  it('should get simple environment variables', () => {
    const { stack } = setupTestingStack();

    const env = new Environment(stack, 'env-test', {
      foo: 'foo',
      bar: 'bar',
    });

    const values = env.getValues();

    expect(values).toStrictEqual({
      foo: 'foo',
      bar: 'bar',
    });
  });

  it('should get environment from ssm', () => {
    const { stack } = setupTestingStack();

    const env = new Environment(stack, 'env-test', {
      foo: 'SSM::STRING::/foo/bar',
    });

    const values = env.getValues() as Record<string, string>;

    expect(values.foo.includes('${TfToken[')).toBeTruthy();
  });

  it('should get environment from secure ssm', () => {
    const { stack } = setupTestingStack();

    const env = new Environment(stack, 'env-test', {
      foo: 'SSM::SECURE_STRING::/foo/bar',
    });

    const values = env.getValues() as Record<string, string>;

    expect(values.foo.includes('${TfToken[')).toBeTruthy();
  });

  it('should return false for unresolved value', () => {
    const { stack } = setupTestingStack();

    const env = new Environment(stack, 'env-test', ({ getResourceValue }) => ({
      foo: getResourceValue('test::unresolved', 'id'),
    }));

    const values = env.getValues();

    expect(values).toBeFalsy();
  });

  it('should resolve global parameter value', () => {
    const { stack } = setupTestingStack();

    const bucket = alicantoResource.create('bucket', S3Bucket, stack, 'test', {});
    bucket.isGlobal();

    const env = new Environment(stack, 'env-test', ({ getResourceValue }) => ({
      foo: getResourceValue('bucket::test', 'id'),
    }));

    const values = env.getValues() as Record<string, string>;

    expect(values.foo.includes('${TfToken[')).toBeTruthy();
  });
});
