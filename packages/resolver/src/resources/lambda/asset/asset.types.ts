import type { ResourceMetadata } from '@alicanto/common';
import type { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import type { Construct } from 'constructs';

interface BaseAsset
  extends Pick<ResourceMetadata, 'filename' | 'foldername' | 'minify'> {}

export interface AssetResource {
  className: string;
  methods: string[];
}
export interface AssetMetadata extends BaseAsset, AssetResource {
  afterBuild?: (outputPath: string) => void;
}

export interface AssetProps {
  metadata: AssetMetadata;
  resources: Record<string, AssetResource>;
  scope?: Construct;
  lambdas: LambdaFunction[];
}

export interface BuildAssetProps {
  scope: Construct;
  metadata: AssetMetadata;
}

export interface AddLambdaProps extends Omit<BaseAsset, 'minify'> {
  lambda: LambdaFunction;
  scope: Construct;
}
