import 'cdktf/lib/testing/adapters/jest';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { Testing } from 'cdktf';
import { setupTestingStack } from '../../utils';
import { Role } from './role';

describe('Role', () => {
  it('should create a role by service', () => {
    const { stack } = setupTestingStack();

    new Role(stack, 'testing', {
      name: 'testing',
      services: ['s3'],
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRole, {
      assume_role_policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Action" = "sts:AssumeRole", "Effect" = "Allow", "Principal" = {"Service" = "lambda.amazonaws.com"}}]})}',
      name: 'testing',
    });

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      name: 'testing-policy',
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["s3:AbortMultipartUpload", "s3:CreateBucket", "s3:DeleteBucket", "s3:DeleteObject", "s3:DeleteObjectTagging", "s3:DeleteObjectVersion", "s3:DeleteObjectVersionTagging", "s3:GetBucketTagging", "s3:GetBucketVersioning", "s3:GetObject", "s3:GetObjectAttributes", "s3:GetObjectTagging", "s3:GetObjectVersion", "s3:GetObjectVersionAttributes", "s3:GetObjectVersionTagging", "s3:ListAllMyBuckets", "s3:ListBucket", "s3:ListBucketMultipartUploads", "s3:ListBucketVersions", "s3:ListMultipartUploadParts", "s3:PutObject", "s3:PutObjectTagging", "s3:PutObjectVersionTagging", "s3:ReplicateDelete", "s3:ReplicateObject", "s3:ReplicateTags", "s3:RestoreObject"], "Resource" = "*"}]})}',
      role: '${aws_iam_role.testing.id}',
    });
  });

  it('should create a role with custom services', () => {
    const { stack } = setupTestingStack();

    new Role(stack, 'testing', {
      name: 'testing',
      services: [
        {
          serviceName: 'testing',
          type: 'custom',
          permissions: ['foo', 'bar'],
        },
      ],
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      name: 'testing-policy',
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["testing:foo", "testing:bar"], "Resource" = ["*"]}]})}',
      role: '${aws_iam_role.testing.id}',
    });
  });

  it('should create a with custom principal', () => {
    const { stack } = setupTestingStack();

    new Role(stack, 'testing', {
      name: 'testing',
      services: ['s3'],
      principal: 's3.amazon.com',
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRole, {
      assume_role_policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Action" = "sts:AssumeRole", "Effect" = "Allow", "Principal" = {"Service" = "s3.amazon.com"}}]})}',
      name: 'testing',
    });
  });
});
