import { type ClassResource, cleanString } from '@alicanto/common';
import { type AppStack, alicantoResource } from '@alicanto/resolver';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3BucketAccelerateConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-accelerate-configuration';
import { S3BucketAcl } from '@cdktf/provider-aws/lib/s3-bucket-acl';
import { S3BucketLifecycleConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-lifecycle-configuration';
import { S3BucketNotification } from '@cdktf/provider-aws/lib/s3-bucket-notification';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';

import { getBucketInformation } from '../../service';
import type { BucketGlobalConfig } from '../resolver.types';

export class BucketParser {
  constructor(
    private scope: AppStack,
    private bucket: ClassResource,
    private config: BucketGlobalConfig
  ) {}

  public generate() {
    const {
      name,
      prefix,
      eventBridgeEnabled,
      acl,
      forceDestroy,
      transferAcceleration,
      versioned,
      lifeCycleRules,
    } = getBucketInformation(this.bucket);

    const bucketId = `bucket_${name}`;

    const bucket = alicantoResource.create(S3Bucket, this.scope, bucketId, {
      bucket: name,
      bucketPrefix: prefix,
      forceDestroy,
    });

    bucket.isGlobal();

    if (eventBridgeEnabled ?? this.config.eventBridgeEnabled) {
      new S3BucketNotification(this.scope, `${bucketId}_notification`, {
        bucket: bucket.id,
        eventbridge: true,
      });
    }

    if (acl || this.config.acl) {
      new S3BucketAcl(this.scope, `${bucketId}-acl`, {
        bucket: bucket.id,
        acl: acl || this.config.acl,
      });
    }

    if (versioned ?? this.config.versioned) {
      new S3BucketVersioningA(this.scope, `${bucketId}-versioned`, {
        bucket: bucket.id,
        versioningConfiguration: {
          status: 'Enabled',
        },
      });
    }

    if (transferAcceleration ?? this.config.transferAcceleration) {
      new S3BucketAccelerateConfiguration(this.scope, `${bucketId}-versioned`, {
        bucket: bucket.id,
        status: 'Enabled',
      });
    }

    const lifeCycle = lifeCycleRules || this.config.lifeCycleRules || {};

    if (Object.keys(lifeCycle).length > 0) {
      new S3BucketLifecycleConfiguration(this.scope, `${bucketId}-lifecycle`, {
        bucket: bucket.id,
        rule: Object.keys(lifeCycle).map((key) => {
          const rule = lifeCycle[key];
          return {
            id: `${bucketId}-lc-rule-${cleanString(key)}`,
            status: 'Enabled',
            filter: [
              {
                prefix: key,
                objectSizeGreaterThan: rule.condition?.objectSizeGreaterThan,
                objectSizeLessThan: rule.condition?.objectSizeLessThan,
              },
            ],
            expiration: rule.expiration
              ? [
                  {
                    days: rule.expiration.days,
                    date: rule.expiration.date
                      ? rule.expiration.date
                          .toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                          .replace(/\//g, '-')
                      : undefined,
                    expiredObjectDeleteMarker: rule.expiration.expiredObjectDeleteMarker,
                  },
                ]
              : undefined,
            transition: (rule.transitions || []).map((transition) => ({
              days: transition.days,
              storageClass: transition.storage,
            })),
          };
        }),
      });
    }
  }
}
