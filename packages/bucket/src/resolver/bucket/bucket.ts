import { cleanString } from '@alicanto/common';
import { alicantoResource } from '@alicanto/resolver';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { S3BucketAccelerateConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-accelerate-configuration';
import { S3BucketAcl } from '@cdktf/provider-aws/lib/s3-bucket-acl';
import { S3BucketLifecycleConfiguration } from '@cdktf/provider-aws/lib/s3-bucket-lifecycle-configuration';
import { S3BucketNotification } from '@cdktf/provider-aws/lib/s3-bucket-notification';
import { S3BucketVersioningA } from '@cdktf/provider-aws/lib/s3-bucket-versioning';
import type { Construct } from 'constructs';
import { getBucketInformation } from '../../service';
import type { BucketProps } from './bucket.types';

export class Bucket extends alicantoResource.make(S3Bucket) {
  constructor(scope: Construct, props: BucketProps) {
    const {
      name,
      prefix,
      eventBridgeEnabled,
      acl,
      forceDestroy,
      transferAcceleration,
      versioned,
      lifeCycleRules,
      tags,
    } = getBucketInformation(props.classResource);

    super(scope, `${name}-bucket`, {
      bucket: name,
      bucketPrefix: prefix,
      forceDestroy: forceDestroy ?? props.forceDestroy,
      tags: tags ?? {
        ...(tags || {}),
        ...(props.tags || {}),
      },
    });

    this.isGlobal('bucket');

    if (eventBridgeEnabled ?? props.eventBridgeEnabled) {
      new S3BucketNotification(this, `${name}-notification`, {
        bucket: this.id,
        eventbridge: true,
      });
    }

    if (acl || props.acl) {
      new S3BucketAcl(this, `${name}-acl`, {
        bucket: this.id,
        acl: acl || props.acl,
      });
    }

    if (versioned ?? props.versioned) {
      new S3BucketVersioningA(this, `${name}-versioned`, {
        bucket: this.id,
        versioningConfiguration: {
          status: 'Enabled',
        },
      });
    }

    if (transferAcceleration ?? props.transferAcceleration) {
      new S3BucketAccelerateConfiguration(this, `${name}-accelerate-config`, {
        bucket: this.id,
        status: 'Enabled',
      });
    }

    const lifeCycle = lifeCycleRules || props.lifeCycleRules || {};

    if (Object.keys(lifeCycle).length > 0) {
      new S3BucketLifecycleConfiguration(this, `${name}-lifecycle`, {
        bucket: this.id,
        rule: Object.keys(lifeCycle).map((key) => {
          const rule = lifeCycle[key];
          return {
            id: `${name}-lc-rule-${cleanString(key)}`,
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
