import type { LambdaFunction } from '@cdktf/provider-aws/lib/lambda-function';
import type { Construct } from 'constructs';
import type { LambdaHandlerProps } from '../lambda.types';

interface BaseAsset
  extends Pick<LambdaHandlerProps, 'filename' | 'pathName' | 'minify'> {}

export interface AssetMetadata extends BaseAsset {
  className: string;
  methods: string[];
}

export interface AssetProps {
  metadata: AssetMetadata;
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
