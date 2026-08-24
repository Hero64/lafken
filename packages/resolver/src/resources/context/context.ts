import { DataAwsCallerIdentity } from '@cdktn/provider-aws/lib/data-aws-caller-identity';
import { DataAwsPartition } from '@cdktn/provider-aws/lib/data-aws-partition';
import { DataAwsRegion } from '@cdktn/provider-aws/lib/data-aws-region';
import { TerraformStack } from 'cdktn';
import type { Construct } from 'constructs';

/**
 * Resolves and caches AWS account/region context data sources.
 *
 * Each data source is created once per Terraform stack so that the same
 * token is reused across every resource that requests it.
 */
export class ContextFactory {
  private callerIdentity = new WeakMap<TerraformStack, DataAwsCallerIdentity>();
  private region = new WeakMap<TerraformStack, DataAwsRegion>();
  private partition = new WeakMap<TerraformStack, DataAwsPartition>();

  private getCallerIdentity(scope: Construct) {
    const stack = TerraformStack.of(scope);

    if (!this.callerIdentity.has(stack)) {
      this.callerIdentity.set(
        stack,
        new DataAwsCallerIdentity(stack, 'lafken-caller-identity', {})
      );
    }

    return this.callerIdentity.get(stack) as DataAwsCallerIdentity;
  }

  private getRegion(scope: Construct) {
    const stack = TerraformStack.of(scope);

    if (!this.region.has(stack)) {
      this.region.set(stack, new DataAwsRegion(stack, 'lafken-region', {}));
    }

    return this.region.get(stack) as DataAwsRegion;
  }

  private getPartition(scope: Construct) {
    const stack = TerraformStack.of(scope);

    if (!this.partition.has(stack)) {
      this.partition.set(stack, new DataAwsPartition(stack, 'lafken-partition', {}));
    }

    return this.partition.get(stack) as DataAwsPartition;
  }

  /** AWS account ID of the caller (e.g. `123456789012`). */
  public getAccountId(scope: Construct) {
    return this.getCallerIdentity(scope).accountId;
  }

  /** ARN associated with the caller credentials. */
  public getCallerArn(scope: Construct) {
    return this.getCallerIdentity(scope).arn;
  }

  /** AWS region name where resources are deployed (e.g. `us-east-1`). */
  public getRegionName(scope: Construct) {
    return this.getRegion(scope).name;
  }

  /** AWS partition (e.g. `aws`, `aws-cn`, `aws-us-gov`). */
  public getPartitionName(scope: Construct) {
    return this.getPartition(scope).partition;
  }

  /** Base DNS domain for the AWS partition (e.g. `amazonaws.com`). */
  public getDnsSuffix(scope: Construct) {
    return this.getPartition(scope).dnsSuffix;
  }
}

export const contextFactory = new ContextFactory();
