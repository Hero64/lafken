import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { setupTestingStack } from '@lafken/resolver';
import { Aspects, Testing } from 'cdktn';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vitest';
import { AppAspect } from './aspect';

describe('App Aspect', () => {
  it('should add tags to children resources', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-module');
        new S3Bucket(this, 's3-bucket');

        Aspects.of(this).add(
          new AppAspect(scope, 'test', {
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

  it('should add environment variables to lambda functions', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-module');
        new LambdaFunction(this, 'lambda', {
          functionName: 'test-fn',
          role: 'arn:aws:iam::123456789:role/test',
          handler: 'index.handler',
          runtime: 'nodejs20.x',
        });

        Aspects.of(this).add(
          new AppAspect(scope, 'test', {
            environment: {
              STAGE: 'production',
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {
          STAGE: 'production',
        },
      },
    });
  });

  it('should merge environment variables with existing ones', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-module');
        new LambdaFunction(this, 'lambda', {
          functionName: 'test-fn',
          role: 'arn:aws:iam::123456789:role/test',
          handler: 'index.handler',
          runtime: 'nodejs20.x',
          environment: {
            variables: {
              EXISTING: 'value',
            },
          },
        });

        Aspects.of(this).add(
          new AppAspect(scope, 'test', {
            environment: {
              STAGE: 'production',
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {
          STAGE: 'production',
          EXISTING: 'value',
        },
      },
    });
  });

  it('should not affect non-lambda resources when only environment is set', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-module');
        new S3Bucket(this, 's3-bucket');

        Aspects.of(this).add(
          new AppAspect(scope, 'test', {
            environment: {
              STAGE: 'production',
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(S3Bucket, {});
  });
});
