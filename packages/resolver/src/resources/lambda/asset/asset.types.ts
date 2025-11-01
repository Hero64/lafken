import type { TerraformAsset } from 'cdktf';
import type { LambdaHandlerProps } from '../lambda.types';

export interface AssetMetadata {
  className: string;
  methods: string[];
}

export interface AssetProps {
  metadata: AssetMetadata;
  asset?: TerraformAsset;
}

export interface BuildHandlerProps
  extends Pick<LambdaHandlerProps, 'filename' | 'pathName' | 'minify'> {}
