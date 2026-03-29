import type { BucketNames, OnlyOne, ResourceOutputType } from '@lafken/common';
import 'reflect-metadata';

export enum BucketMetadataKeys {
  bucket = 's3:bucket',
}

export type TransitionStorage =
  | 'glacier'
  | 'standard_ia'
  | 'onezone_ia'
  | 'intelligent_tiering'
  | 'deep_archive'
  | 'glacier_ir';

export type BucketOutputAttributes =
  | 'id'
  | 'arn'
  | 'bucketDomainName'
  | 'bucketRegionalDomainName';

export interface Transition {
  /**
   * Target storage class for the transition.
   *
   * This defines the S3 storage class to which the objects will be moved.
   */
  storage: TransitionStorage;
  /**
   * Number of days after object creation when the transition occurs.
   *
   * The object will be moved to the specified storage class after this
   * number of days.
   */
  days: number;
}

export interface Expiration {
  days?: number;
  date?: Date;
  expiredObjectDeleteMarker?: boolean;
}

export interface KeyLifeCycleRule {
  /**
   * Defines the expiration configuration for objects stored in the S3 bucket.
   *
   * This property specifies when the objects that match the lifecycle rule
   * should be automatically deleted by Amazon S3.
   * @example
   * ```
   * // one of
   * {
   *   expiration: {
   *     days: 10
   *   }
   * }
   * // or
   * {
   *   expiration: {
   *     date: new Date()
   *   }
   * }
   * // or
   * {
   *   expiration: {
   *     expiredObjectDeleteMarker: true
   *   }
   * }
   * ```
   */
  expiration?: OnlyOne<Expiration>;
  /**
   * Optional conditions to apply the lifecycle rule only to objects
   * that match certain size thresholds.
   *
   * @example
   * ```
   * {
   *   condition: {
   *     objectSizeGreaterThan: 10000,
   *     objectSizeLessThan: 100
   *   }
   * }
   * ```
   */
  condition?: {
    /**
     * Minimum object size in bytes for the lifecycle rule to apply.
     *
     * The rule will only apply to objects larger than this value.
     */
    objectSizeGreaterThan?: number;

    /**
     * Maximum object size in bytes for the lifecycle rule to apply.
     *
     * The rule will only apply to objects smaller than this value.
     */
    objectSizeLessThan?: number;
  };
  /**
   * Transition rules that define how and when objects are moved
   * to different S3 storage classes (e.g., GLACIER, INTELLIGENT_TIERING).
   *
   * @example
   * ```
   * {
   *   transitions: [
   *     {
   *       storage: 'standard_ia'
   *       days: 10,
   *     }
   *   ]
   * }
   * ```
   */
  transitions?: Transition[];
}

export interface BaseBucketProps {
  /**
   * Bucket resource name.
   *
   * Defines the logical name of the bucket resource.
   * If not specified, the name of the decorated class will be used.
   */
  name?: BucketNames;
  /**
   * Enable X-Ray tracing.
   *
   * When enabled, AWS X-Ray tracing is activated for the bucket-related
   * operations. This allows you to trace and analyze requests as they
   * pass through AWS services, useful for debugging and performance
   * monitoring.
   */
  tracing?: boolean;
}

export interface InternalBucketProps extends BaseBucketProps {
  isExternal?: never;

  /**
   * Enable EventBridge events.
   *
   * When enabled, Amazon S3 automatically sends events for this bucket
   * to Amazon EventBridge. This allows you to capture S3 bucket events
   * (such as object created, deleted, etc.).
   */
  eventBridgeEnabled?: boolean;
  /**
   * Defines the Access Control List (ACL) configuration for the S3 bucket.
   *
   * This property determines the default access level applied to all objects
   * within the bucket unless overridden at the object level.
   *
   * - `'private'`: Grants access only to the bucket owner. This is the most secure option
   *   and the default behavior in most cases.
   * - `'public-read'`: Allows anyone on the internet to read objects in the bucket,
   *   but only the bucket owner can write or modify them.
   * - `'public-read-write'`: Grants both read and write access to everyone.
   *   This setting is **not recommended** for production use, as it exposes your bucket
   *   to public writes and potential misuse.
   */
  acl?: 'private' | 'public-read' | 'public-read-write';
  /**
   * Enable transfer acceleration for the S3 bucket.
   *
   * Transfer acceleration leverages Amazon CloudFront's globally distributed
   * edge locations to accelerate data transfers between clients and the bucket.
   * This reduces latency and improves throughput, particularly when
   * users are geographically distant from the bucket's AWS region.
   */
  transferAcceleration?: boolean;
  /**
   * Enable versioning for the S3 bucket.
   *
   * When enabled, the bucket keeps multiple versions of an object,
   * allowing recovery from accidental overwrites or deletions.
   * Versioning provides a safeguard for data protection and
   * can also be used for auditing and historical tracking.
   */
  versioned?: boolean;
  /**
   * Lifecycle rules for the S3 bucket.
   *
   * Defines rules to automatically manage the lifecycle of objects in the bucket,
   * such as transitioning them to different storage classes, expiring them after
   * a given time, or cleaning up incomplete multipart uploads.
   *
   * @example
   * ```
   * {
   *   lifeCycleRules: {
   *      'key-path': { // represents an object in the bucket
   *        expiration: {
   *          days: 20,
   *        },
   *        condition: {
   *          objectSizeGreaterThan: 2024 // value in bytes
   *        }
   *      }
   *   }
   * }
   * ```
   */
  lifeCycleRules?: Record<string, KeyLifeCycleRule>;
  /**
   * Indicates all objects from bucket should be deleted when bucket is destroyed
   */
  forceDestroy?: boolean;
  /**
   * tags.
   *
   * Specifies a set of tags that will be applied to s3 bucket.
   */
  tags?: Record<string, string>;
  /**
   * Defines which S3 Bucket attributes should be exported.
   *
   * Supported attributes are based on Terraform `aws_s3_bucket`
   * exported attributes and currently include:
   * - `id`: Name of the bucket.
   * - `arn`: ARN of the bucket (`arn:aws:s3:::bucketname`).
   * - `bucketDomainName`: Bucket domain name (`bucketname.s3.amazonaws.com`).
   * - `bucketRegionalDomainName`: Region-specific bucket domain name.
   *
   * Each selected attribute can be exported through SSM Parameter Store (`type: 'ssm'`)
   * or Terraform outputs (`type: 'output'`).
   *
   * @example
   * {
   *   outputs: [
   *     { type: 'ssm', name: '/my-bucket/arn', value: 'arn' },
   *     { type: 'output', name: 'bucket_regional_domain', value: 'bucketRegionalDomainName' }
   *   ]
   * }
   */
  outputs?: ResourceOutputType<BucketOutputAttributes>;
}

export interface ExternalBucketProps extends BaseBucketProps {
  /**
   * Marks the bucket as an external resource.
   *
   * When set to `true`, the bucket is not created by the framework.
   * Instead, it references an existing S3 bucket using the provided `name`.
   */
  isExternal: true;
}

export type BucketProps = InternalBucketProps | ExternalBucketProps;

export interface InternalBucketMetadataProps extends Omit<InternalBucketProps, 'name'> {
  name: string;
}

export interface ExternalBucketMetadataProps extends Omit<ExternalBucketProps, 'name'> {
  name: string;
}

export type BucketMetadata = InternalBucketMetadataProps | ExternalBucketMetadataProps;
