import type { TerraformAsset } from 'cdktf';

export interface AssetMetadata {
  className: string;
  methods: string[];
}

export interface AssetProps {
  metadata: AssetMetadata;
  asset?: TerraformAsset;
}
