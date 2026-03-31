import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import { type TerraformStack, Testing } from 'cdktn';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContextName } from '../../types';
import { setupTestingStack } from '../../utils';
import { Role } from '../role';
import { lambdaAssets } from './asset/asset';
import { LambdaHandler } from './lambda';

describe('Lambda handler', () => {
  let stack: TerraformStack;
  beforeEach(() => {
    const testing = setupTestingStack();
    stack = testing.stack;

    stack.node.setContext(ContextName.app, {
      contextCreator: ContextName.app,
    });

    const role = new Role(stack, `${ContextName.app}-global-role`, {
      name: 'testing',
      services: ['cloudwatch'],
    });

    role.isGlobal('app', `${ContextName.app}-global-role`);
  });

  it('should create a lambda function', () => {
    lambdaAssets.initializeMetadata({
      foldername: '/temp',
      filename: 'index',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });
    new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      foldername: '/temp',
      originalName: 'test',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {},
      },
      function_name: 'test-app',
      handler: 'index.lambda-test_test',
      runtime: 'nodejs22.x',
      tracing_config: {
        mode: 'PassThrough',
      },
    });
  });

  it('should create a lambda function with custom variables', () => {
    lambdaAssets.initializeMetadata({
      foldername: '/temp',
      filename: 'index',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });
    new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      foldername: '/temp',
      originalName: 'test',
      lambda: {
        enableTrace: true,
        services: ['s3'],
        env: { foo: 'bar' },
        memory: 200,
        runtime: 20,
        timeout: 100,
        tags: {
          foo: 'bar',
        },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {
          foo: 'bar',
        },
      },
      function_name: 'test-app',
      handler: 'index.lambda-test_test',
      memory_size: 200,
      runtime: 'nodejs20.x',
      timeout: 100,
      tracing_config: {
        mode: 'Active',
      },
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      name: 'test-app-role-policy',
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["s3:AbortMultipartUpload", "s3:CreateBucket", "s3:DeleteBucket", "s3:DeleteObject", "s3:DeleteObjectTagging", "s3:DeleteObjectVersion", "s3:DeleteObjectVersionTagging", "s3:GetBucketTagging", "s3:GetBucketVersioning", "s3:GetObject", "s3:GetObjectAttributes", "s3:GetObjectTagging", "s3:GetObjectVersion", "s3:GetObjectVersionAttributes", "s3:GetObjectVersionTagging", "s3:ListAllMyBuckets", "s3:ListBucket", "s3:ListBucketMultipartUploads", "s3:ListBucketVersions", "s3:ListMultipartUploadParts", "s3:PutObject", "s3:PutObjectTagging", "s3:PutObjectVersionTagging", "s3:ReplicateDelete", "s3:ReplicateObject", "s3:ReplicateTags", "s3:RestoreObject"], "Resource" = "*"}]})}',
    });
  });

  it('should create a lambda function with static vpc config', () => {
    lambdaAssets.initializeMetadata({
      foldername: '/temp',
      filename: 'index',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });
    new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      foldername: '/temp',
      originalName: 'test',
      lambda: {
        vpcConfig: {
          securityGroupIds: ['sg-123456'],
          subnetIds: ['subnet-abc', 'subnet-def'],
        },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      function_name: 'test-app',
      vpc_config: {
        security_group_ids: ['sg-123456'],
        subnet_ids: ['subnet-abc', 'subnet-def'],
      },
    });
  });

  it('should create a lambda function with vpc config from callback', () => {
    lambdaAssets.initializeMetadata({
      foldername: '/temp',
      filename: 'index',
      className: 'Testing',
      methods: ['foo', 'bar'],
      minify: false,
    });
    new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      foldername: '/temp',
      originalName: 'test',
      lambda: {
        vpcConfig: ({ getSSMValue }) => ({
          securityGroupIds: [getSSMValue('/vpc/security-group-id')],
          subnetIds: [getSSMValue('/vpc/subnet-id')],
        }),
      },
    });

    const synthesized = Testing.synth(stack);
    const parsed = JSON.parse(synthesized);
    const lambda = Object.values(parsed.resource.aws_lambda_function)[0] as any;

    expect(lambda.vpc_config.security_group_ids).toHaveLength(1);
    expect(lambda.vpc_config.security_group_ids[0]).toContain('aws_ssm_parameter');
    expect(lambda.vpc_config.subnet_ids).toHaveLength(1);
    expect(lambda.vpc_config.subnet_ids[0]).toContain('aws_ssm_parameter');
  });
});
