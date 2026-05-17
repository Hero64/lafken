import type { GetResourceProps } from './resource.types';

export type ServicesName =
  | 'dynamodb'
  | 's3'
  | 'lambda'
  | 'cloudwatch'
  | 'sqs'
  | 'state_machine'
  | 'kms'
  | 'ssm'
  | 'event'
  | 'kinesis';

interface PermissionService<T extends ServicesName | 'custom', P extends string> {
  type: T;
  permissions?: P[];
  resources?: string[];
}

export type DynamoPermissions =
  | 'Query'
  | 'Scan'
  | 'GetItem'
  | 'BatchGetItem'
  | 'PutItem'
  | 'DeleteItem'
  | 'UpdateItem'
  | 'ConditionCheckItem'
  | 'DescribeStream'
  | 'GetRecords'
  | 'GetShardIterator'
  | 'ListStreams';

export type S3Permissions =
  | 'AbortMultipartUpload'
  | 'CreateBucket'
  | 'DeleteBucket'
  | 'DeleteObject'
  | 'DeleteObjectTagging'
  | 'DeleteObjectVersion'
  | 'DeleteObjectVersionTagging'
  | 'GetBucketTagging'
  | 'GetBucketVersioning'
  | 'GetObject'
  | 'GetObjectAttributes'
  | 'GetObjectTagging'
  | 'GetObjectVersion'
  | 'GetObjectVersionAttributes'
  | 'GetObjectVersionTagging'
  | 'ListAllMyBuckets'
  | 'ListBucket'
  | 'ListBucketMultipartUploads'
  | 'ListBucketVersions'
  | 'ListMultipartUploadParts'
  | 'PutObject'
  | 'PutObjectTagging'
  | 'PutObjectVersionTagging'
  | 'ReplicateDelete'
  | 'ReplicateObject'
  | 'ReplicateTags'
  | 'RestoreObject';

export type LambdaPermissions = 'InvokeFunction';

export type LogsPermission = 'CreateLogGroup' | 'CreateLogStream' | 'PutLogEvents';

export type SQSPermissions =
  | 'DeleteMessage'
  | 'GetQueueUrl'
  | 'ReceiveMessage'
  | 'ReceiveMessage'
  | 'SendMessage'
  | 'GetQueueAttributes';

export type StateMachinePermissions =
  | 'InvokeHTTPEndpoint'
  | 'DescribeExecution'
  | 'StartExecution'
  | 'StopExecution'
  | 'DescribeExecution'
  | 'GetExecutionHistory';

export type KMSPermissions =
  | 'Decrypt'
  | 'DescribeKey'
  | 'Encrypt'
  | 'GenerateDataKey'
  | 'GenerateRandom'
  | 'GetPublicKey'
  | 'Sign'
  | 'Verify';

export type SSMPermissions =
  | 'DescribeParameters'
  | 'GetDocument'
  | 'GetParameter'
  | 'GetParameters'
  | 'GetParametersByPath'
  | 'ListDocuments'
  | 'PutParameter';

export type EventPermissions =
  | 'DescribeEventRule'
  | 'DescribeEventBus'
  | 'DescribeRule'
  | 'PutEvents'
  | 'PutRule';

export type KinesisPermissions =
  | 'PutRecord'
  | 'PutRecords'
  | 'GetRecords'
  | 'GetShardIterator'
  | 'DescribeStream'
  | 'ListStreams';

export type Services =
  | ServicesName
  | PermissionService<'dynamodb', DynamoPermissions>
  | PermissionService<'s3', S3Permissions>
  | PermissionService<'lambda', LambdaPermissions>
  | PermissionService<'cloudwatch', LogsPermission>
  | PermissionService<'sqs', SQSPermissions>
  | PermissionService<'state_machine', StateMachinePermissions>
  | PermissionService<'kms', KMSPermissions>
  | PermissionService<'ssm', SSMPermissions>
  | PermissionService<'event', EventPermissions>
  | PermissionService<'kinesis', KinesisPermissions>
  | (PermissionService<'custom', string> & { serviceName: string });

export type ServiceFunction = (props: GetResourceProps) => Services[];

export type ServicesValues = Services[] | ServiceFunction;
