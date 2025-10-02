import type { BucketNames, OnlyOne } from '@alicanto/common';
import 'reflect-metadata';

export enum BucketMetadataKeys {
  BUCKET = 's3:bucket',
}

export type TransitionStorage =
  | 'glacier'
  | 'standard_ia'
  | 'onezone_ia'
  | 'intelligent_tiering'
  | 'deep_archive'
  | 'glacier_ir';

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
  // TODO: completar
  expiration?: OnlyOne<Expiration>;
  /**
   * Optional conditions to apply the lifecycle rule only to objects
   * that match certain size thresholds.
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
    /**
     * TODO: ver la posibilidad de agregar tags
     */
    tags: Record<string, string>;
  };
  /**
   * Transition rules that define how and when objects are moved
   * to different S3 storage classes (e.g., GLACIER, INTELLIGENT_TIERING).
   */
  transitions?: Transition[];
}

export interface BucketProps {
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
  /**
   * Enable EventBridge events.
   *
   * When enabled, Amazon S3 automatically sends events for this bucket
   * to Amazon EventBridge. This allows you to capture S3 bucket events
   * (such as object created, deleted, etc.).
   */
  eventBridgeEnabled?: boolean;
  /**
   * TODO: completar
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
   */
  lifeCycleRules?: Record<string, KeyLifeCycleRule>;
  /**
   * Indicates all objects from bucket should be deleted when bucket is destroyed
   */
  forceDestroy?: boolean;
  /**
   * Name prefix
   */
  prefix?: string;
}

export interface BucketMetadataProps extends Omit<BucketProps, 'name'> {
  name: string;
}
