import { IamRole } from '@cdktn/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktn/provider-aws/lib/iam-role-policy';
import type {
  ServiceFunction,
  Services,
  ServicesName,
  ServicesValues,
} from '@lafken/common';
import { Fn } from 'cdktn';
import type { Construct } from 'constructs';
import { resolveCallbackResource } from '../../utils';
import { lafkenResource } from '../resource';
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
  cloudwatch: [
    'CreateLogGroup',
    'CreateLogStream',
    'PutLogEvents',
    'CreateLogDelivery',
    'GetLogDelivery',
    'UpdateLogDelivery',
    'DeleteLogDelivery',
    'ListLogDeliveries',
    'PutResourcePolicy',
    'DescribeResourcePolicies',
    'DescribeLogGroups',
  ],
  sqs: [
    'DeleteMessage',
    'GetQueueUrl',
    'SendMessage',
    'ReceiveMessage',
    'SendMessage',
    'GetQueueAttributes',
  ],
  state_machine: [
    'InvokeHTTPEndpoint',
    'DescribeExecution',
    'StartExecution',
    'StopExecution',
    'GetExecutionHistory',
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

const RolePolicy = lafkenResource.make(IamRolePolicy);

export class Role extends lafkenResource.make(IamRole) {
  constructor(
    scope: Construct,
    id: string,
    private props: RoleProps
  ) {
    super(scope, id, {
      name: props.name,
      assumeRolePolicy: Fn.jsonencode({
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
    const policyName = `${this.props.name}-policy`;

    const statement = this.createPolicyStatement(this.props.services);

    const rolePolicy = new RolePolicy(this, policyName, {
      name: policyName,
      role: this.id,
      policy: statement ? Fn.jsonencode(statement) : '',
    });

    if (!statement) {
      rolePolicy.isDependent(() => {
        const statement = this.createPolicyStatement(this.props.services);
        if (!statement) {
          throw new Error('The role policy could not resolve one of its dependencies');
        }

        rolePolicy.addOverride('policy', Fn.jsonencode(statement));
      });
    }
  }

  private getPolice(services: Services[]) {
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

  private resolveServices = (getServices: ServiceFunction) => {
    const services = resolveCallbackResource(getServices);
    if (!services) {
      return false;
    }

    return this.getPolice(services);
  };

  private createPolicyStatement(services: ServicesValues) {
    if (Array.isArray(services)) {
      return this.getPolice(services);
    }

    return this.resolveServices(services);
  }
}
