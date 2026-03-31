import { beforeEach } from 'node:test';
import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import { S3Bucket } from '@cdktn/provider-aws/lib/s3-bucket';
import { lafkenResource, setupTestingStack } from '@lafken/resolver';
import { Aspects, Testing } from 'cdktn';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vitest';
import { AppAspect } from './aspect';

describe('App Aspect', () => {
  beforeEach(() => {
    lafkenResource.reset();
  });
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

  it('should add vpc config to lambda functions', () => {
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
            vpc: {
              securityGroupIds: ['sg-123456'],
              subnetIds: ['subnet-abc', 'subnet-def'],
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      vpc_config: {
        security_group_ids: ['sg-123456'],
        subnet_ids: ['subnet-abc', 'subnet-def'],
      },
    });
  });

  it('should preserve lambda-level vpc config over aspect vpc config', () => {
    const { stack } = setupTestingStack();

    class TestModule extends Construct {
      constructor(scope: Construct) {
        super(scope, 'test-vpc-preserve');
        new LambdaFunction(this, 'lambda-with-vpc', {
          functionName: 'test-fn',
          role: 'arn:aws:iam::123456789:role/test',
          handler: 'index.handler',
          runtime: 'nodejs20.x',
          vpcConfig: {
            securityGroupIds: ['sg-original'],
            subnetIds: ['subnet-original'],
          },
        });

        Aspects.of(this).add(
          new AppAspect(scope, 'test', {
            vpc: {
              securityGroupIds: ['sg-aspect'],
              subnetIds: ['subnet-aspect'],
            },
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      vpc_config: {
        security_group_ids: ['sg-original'],
        subnet_ids: ['subnet-original'],
      },
    });
  });

  it('should add vpc config from callback with SSM values', () => {
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
            vpc: ({ getSSMValue }) => ({
              securityGroupIds: [getSSMValue('/vpc/sg-id')],
              subnetIds: [getSSMValue('/vpc/subnet-id')],
            }),
          })
        );
      }
    }

    new TestModule(stack);
    const synthesized = Testing.synth(stack);
    const parsed = JSON.parse(synthesized);
    const lambda = Object.values(parsed.resource.aws_lambda_function)[0] as any;

    expect(lambda.vpc_config.security_group_ids).toHaveLength(1);
    expect(lambda.vpc_config.security_group_ids[0]).toContain('aws_ssm_parameter');
    expect(lambda.vpc_config.subnet_ids).toHaveLength(1);
    expect(lambda.vpc_config.subnet_ids[0]).toContain('aws_ssm_parameter');
  });
});
