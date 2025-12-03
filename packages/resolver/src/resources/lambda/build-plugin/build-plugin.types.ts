import type { AssetResource } from '../asset/asset.types';

export interface AlicantoBuildPluginProps {
  filename: string;
  removeAttributes: string[];
  exports: AssetResource[];
}
