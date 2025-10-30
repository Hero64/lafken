import 'cdktf/lib/testing/adapters/jest';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import { type TerraformStack, Testing } from 'cdktf';
import { ContextName } from '../../types';
import { setupTestingStack } from '../../utils';
import { alicantoResource } from '../resource';
import { Role } from '../role';
import { LambdaHandler } from './lambda';

jest.mock('./asset/asset', () => {
  return {
    lambdaAssets: {
      buildHandler: jest.fn().mockImplementation(() => ({
        generate: jest.fn().mockReturnValue({
          path: '/temp/index.js',
        }),
      })),
    },
  };
});

describe('Lambda handler', () => {
  let stack: TerraformStack;
  beforeEach(() => {
    const testing = setupTestingStack();
    stack = testing.stack;

    stack.node.setContext(ContextName.app, {
      contextCreator: ContextName.app,
    });

    const role = alicantoResource.create(
      'app',
      Role,
      stack,
      `${ContextName.app}-global-role`,
      {
        name: 'testing',
        services: ['cloudwatch'],
      }
    );

    role.isGlobal();
  });

  it('should create a lambda function', async () => {
    const lambdaHandler = new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      pathName: '/temp',
    });

    await lambdaHandler.generate();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {},
      },
      function_name: 'test-app',
      handler: 'index.lambda-test',
      runtime: 'nodejs22.x',
      tracing_config: {
        mode: 'PassThrough',
      },
    });
  });

  it('should create a lambda function with custom variables', async () => {
    const lambdaHandler = new LambdaHandler(stack, 'test', {
      filename: 'index',
      name: 'lambda-test',
      pathName: '/temp',
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

    await lambdaHandler.generate();

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(LambdaFunction, {
      environment: {
        variables: {
          foo: 'bar',
        },
      },
      function_name: 'test-app',
      handler: 'index.lambda-test',
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
      role: '${aws_iam_role.test_lambda-role_13A09D0E.id}',
    });
  });
});
