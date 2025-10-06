import type { ServicesName, ServicesValues } from '@alicanto/common';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import type { Construct } from 'constructs';
import type { RoleProps } from './role.types';

const defaultPermissions: Record<ServicesName, string[]> = {
  dynamodb: [
    'Query',
    'Scan',
    'GetItem',
    'BatchGetItem',
    'PutItem',
    'DeleteItem',
    'UpdateItem',
    'ConditionCheckItem',
  ],
  s3: [
    'AbortMultipartUpload',
    'CreateBucket',
    'DeleteBucket',
    'DeleteObject',
    'DeleteObjectTagging',
    'DeleteObjectVersion',
    'DeleteObjectVersionTagging',
    'GetBucketTagging',
    'GetBucketVersioning',
    'GetObject',
    'GetObjectAttributes',
    'GetObjectTagging',
    'GetObjectVersion',
    'GetObjectVersionAttributes',
    'GetObjectVersionTagging',
    'ListAllMyBuckets',
    'ListBucket',
    'ListBucketMultipartUploads',
    'ListBucketVersions',
    'ListMultipartUploadParts',
    'PutObject',
    'PutObjectTagging',
    'PutObjectVersionTagging',
    'ReplicateDelete',
    'ReplicateObject',
    'ReplicateTags',
    'RestoreObject',
  ],
  lambda: ['InvokeFunction'],
  cloudwatch: ['CreateLogGroup', 'CreateLogStream', 'PutLogEvents'],
  sqs: [
    'DeleteMessage',
    'GetQueueUrl',
    'ReceiveMessage',
    'SendMessage',
    'ReceiveMessage',
    'SendMessage',
  ],
  state_machine: [
    'InvokeHTTPEndpoint',
    'DescribeExecution',
    'StartExecution',
    'StopExecution',
  ],
  kms: [
    'Decrypt',
    'DescribeKey',
    'Encrypt',
    'GenerateDataKey',
    'GenerateRandom',
    'GetPublicKey',
    'Sign',
    'Verify',
  ],
  ssm: [
    'DescribeParameters',
    'GetDocument',
    'GetParameter',
    'GetParameters',
    'GetParametersByPath',
    'ListDocuments',
    'PutParameter',
  ],
  event: [
    'DescribeEventRule',
    'DescribeEventBus',
    'DescribeRule',
    'PutEvents',
    'PutRule',
  ],
};

export const mapServicesName: Partial<Record<ServicesName, string>> = {
  cloudwatch: 'logs',
  state_machine: 'states',
  event: 'events',
};

export class Role extends IamRole {
  constructor(
    scope: Construct,
    id: string,
    private props: RoleProps
  ) {
    super(scope, id, {
      name: props.name,
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: props.principal || 'lambda.amazonaws.com',
            },
          },
        ],
      }),
    });
    this.createPolicy();
  }

  private createPolicy() {
    const policyName = `${this.name}-policy`;
    new IamRolePolicy(this, policyName, {
      name: `${this.name}-policy`,
      role: this.name,
      policy: JSON.stringify(this.createPolicyStatement(this.props.services)),
    });
  }

  private createPolicyStatement(services: ServicesValues[]) {
    const statements = services.map((service) => {
      if (typeof service === 'string') {
        const serviceName = mapServicesName[service] || service;
        return {
          Effect: 'Allow',
          Action: defaultPermissions[service].map((p) => `${serviceName}:${p}`),
          Resource: '*',
        };
      }
      const { type, permissions = [], resources = ['*'] } = service;
      let rolePermissions: string[] = permissions;
      let serviceName: string =
        type === 'custom' ? service.serviceName || 'custom' : type;

      rolePermissions =
        rolePermissions.length === 0
          ? defaultPermissions[type as ServicesName]
          : rolePermissions;

      serviceName = mapServicesName[serviceName as ServicesName] || serviceName;

      return {
        Effect: 'Allow',
        Action: rolePermissions.map((p) => `${serviceName}:${p}`),
        Resource: resources,
      };
    });

    return {
      Version: '2012-10-17',
      Statement: statements,
    };
  }
}
