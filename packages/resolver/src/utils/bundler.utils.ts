import type {
  BundlerConfig,
  LambdaMetadata,
  ResourceMetadata,
  StreamingMethods,
} from '@lafken/common';
import { lambdaAssets } from '../resources';
import type { AssetFileMetadata } from '../resources/lambda/asset/asset.types';

interface InitLambdaAssetMetadataProps {
  metadata: ResourceMetadata;
  handlers: LambdaMetadata[];
  contextBundler?: BundlerConfig;
  streamingByMethod?: StreamingMethods;
  afterBuild?: AssetFileMetadata['afterBuild'];
}

/**
 * Merges a resource-level bundler config with the config inherited from the
 * app/module context. The resource's own `minify` takes precedence, falling
 * back to the context value.
 */
export const resolveBundler = (
  bundler?: BundlerConfig,
  contextBundler?: BundlerConfig
): BundlerConfig => ({
  ...bundler,
  minify: bundler?.minify ?? contextBundler?.minify,
});

export const initLambdaAssetMetadata = ({
  metadata,
  handlers,
  contextBundler,
  streamingByMethod = {},
}: InitLambdaAssetMetadataProps) => {
  lambdaAssets.initializeMetadata({
    asset: {
      foldername: metadata.foldername,
      filename: metadata.filename,
      bundler: resolveBundler(metadata.bundler, contextBundler),
    },
    resource: {
      className: metadata.originalName,
      methods: handlers.map((handler) => ({
        name: handler.name,
        streaming: streamingByMethod[handler.name],
      })),
    },
  });
};
