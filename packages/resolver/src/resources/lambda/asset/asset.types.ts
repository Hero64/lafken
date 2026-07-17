import type { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import type { ResourceMetadata } from '@lafken/common';
import type { Construct } from 'constructs';

interface BaseAsset
  extends Pick<ResourceMetadata, 'filename' | 'foldername' | 'bundler'> {}

export interface AssetResource {
  className: string;
  methods: string[];
  /**
   * Names of the methods (subset of `methods`) that were decorated with
   * `@Streaming`. Their exported handlers are wrapped with
   * `awslambda.streamifyResponse` at build time so the Lambda runtime treats
   * them as response-streaming handlers.
   */
  streamingMethods?: string[];
}

export interface AssetMetadata extends BaseAsset, AssetResource {
  afterBuild?: (outputPath: string) => void;
}

export interface AssetProps {
  metadata: Omit<AssetMetadata, 'className' | 'methods'>;
  resources: Record<string, AssetResource>;
  scope?: Construct;
  lambdas: LambdaFunction[];
}

export interface BuildAssetProps {
  scope: Construct;
  metadata: Omit<AssetMetadata, 'className' | 'methods'>;
}

export interface AddLambdaProps extends Omit<BaseAsset, 'bundler'> {
  lambda: LambdaFunction;
  scope: Construct;
}
