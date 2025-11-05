import type { AssetMetadata } from '../asset/asset.types';

export interface AlicantoBuildPluginProps {
  filename: string;
  removeAttributes: string[];
  export: Pick<AssetMetadata, 'methods' | 'className'>;
}
