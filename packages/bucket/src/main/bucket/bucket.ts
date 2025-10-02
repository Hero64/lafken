import { BucketMetadataKeys, type BucketProps } from './bucket.types';

export const Bucket =
  (props: BucketProps = {}) =>
  (constructor: Function) => {
    const { name = constructor.name } = props;

    Reflect.defineMetadata(
      BucketMetadataKeys.BUCKET,
      {
        name,
        ...props,
      },
      constructor
    );
  };
