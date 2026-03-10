import { BucketMetadataKeys, type BucketProps } from './bucket.types';

/**
 * Class decorator that registers a class as an S3 bucket resource.
 *
 * The decorated class represents an Amazon S3 bucket and its configuration.
 * Options such as versioning, lifecycle rules, ACL, transfer acceleration,
 * and EventBridge integration can be set through the decorator props.
 *
 * @param props - Optional bucket configuration. If omitted, defaults are used
 *                and the class name becomes the bucket resource name.
 *
 * @example
 * ```ts
 * @Bucket({ versioned: true, acl: 'private' })
 * export class UserUploadsBucket {}
 * ```
 *
 * @example
 * ```ts
 * @Bucket({
 *   lifeCycleRules: {
 *     'tmp/': {
 *       expiration: { days: 7 },
 *     },
 *   },
 * })
 * export class TempFilesBucket {}
 * ```
 */
export const Bucket =
  (props: BucketProps = {}) =>
  (target: Function) => {
    const { name = target.name } = props;

    Reflect.defineMetadata(
      BucketMetadataKeys.bucket,
      {
        name,
        ...props,
      },
      target
    );
  };
