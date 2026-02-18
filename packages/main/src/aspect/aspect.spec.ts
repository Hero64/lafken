import 'cdktn/lib/testing/adapters/jest';
import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '@lafken/resolver';
import { Aspects, Testing } from 'cdktn';
import { Construct } from 'constructs';
import { AppAspect } from './aspect';

describe('App Aspect', () => {
  it('should add tags to children resources', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-module');
        new S3Bucket(this, 's3-bucket');

        Aspects.of(this).add(
          new AppAspect({
            tags: {
              foo: 'bar',
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {
      tags: {
        foo: 'bar',
      },
    });
  });
});
