import { mkdir } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { cwd } from 'node:process';
import { AssetType, TerraformAsset } from 'cdktn';
import { createSha256 } from '../../../utils';
import { getAppContext, getModuleContext } from '../../../utils/context.utils';
import { LafkenBuildPlugin } from '../build-plugin/build-plugin';
import type {
  AddLambdaProps,
  AssetProps,
  BuildAssetProps,
  InitializeAssetProps,
} from './asset.types';

class LambdaAssets {
  private lambdaAssets: Record<string, AssetProps> = {};

  public initializeMetadata(props: InitializeAssetProps) {
    const { asset, resource } = props;
    const { filename, foldername } = asset;

    const prebuildPath = this.getPrebuildPath(foldername, filename);
    if (!this.lambdaAssets[prebuildPath]) {
      this.lambdaAssets[prebuildPath] = {
        metadata: asset,
        resources: {},
        lambdas: [],
      };
    }

    this.lambdaAssets[prebuildPath].resources[resource.className] = resource;
  }

  public addLambda(props: AddLambdaProps) {
    const { foldername, filename, lambda, scope } = props;
    const prebuildPath = this.getPrebuildPath(foldername, filename);

    if (!this.lambdaAssets[prebuildPath]) {
      throw new Error(`asset from ${foldername}/${filename} not initialized`);
    }

    this.lambdaAssets[prebuildPath].lambdas.push(lambda);
    this.lambdaAssets[prebuildPath].scope ??= scope;
  }

  public async createAssets() {
    for (const path in this.lambdaAssets) {
      const lambdaAsset = this.lambdaAssets[path];
      if (!lambdaAsset.lambdas.length || !lambdaAsset.scope) {
        continue;
      }

      const asset = await this.buildAsset({
        scope: lambdaAsset.scope,
        metadata: lambdaAsset.metadata,
      });

      for (const lambda of lambdaAsset.lambdas) {
        lambda.filename = asset.path;
      }
    }
  }

  private async buildAsset(props: BuildAssetProps) {
    const { metadata, scope } = props;

    const prebuildPath = this.getPrebuildPath(metadata.foldername, metadata.filename);

    const lambdaAsset = this.lambdaAssets[prebuildPath];
    const outputPath = this.createOutputPath(prebuildPath);

    await mkdir(outputPath, {
      recursive: true,
    });

    const appContext = getAppContext(scope);
    const moduleContext = getModuleContext(scope);
    const external: (string | RegExp)[] = [
      /^@aws-sdk/,
      'aws-lambda',
      /^node:/,
      ...(appContext?.bundler?.externalPackages ?? []),
      ...(moduleContext?.bundler?.externalPackages ?? []),
      ...(metadata.bundler?.externalPackages ?? []),
    ];

    await (async () => {
      const { build } = await import('rolldown');

      await build({
        input: prebuildPath,
        platform: 'node',
        external,
        treeshake: {
          moduleSideEffects: false,
        },
        plugins: [
          LafkenBuildPlugin({
            filename: prebuildPath,
            removeAttributes: ['lambda'],
            exports: Object.values(lambdaAsset.resources),
          }),
        ],
        output: {
          format: 'cjs',
          dir: outputPath,
          entryFileNames: 'index.js',
          chunkFileNames: '[name].js',
          minify: metadata.bundler?.minify,
          comments: {
            legal: false,
            jsdoc: false,
          },
          codeSplitting: {
            groups: [
              {
                name: 'vendor',
                priority: 10,
                test(moduleId) {
                  const isLocal = moduleId.startsWith(dirname(prebuildPath));
                  return !isLocal || moduleId.includes('node_modules');
                },
              },
              {
                name(moduleId) {
                  if (prebuildPath === moduleId) return null;
                  return basename(moduleId, extname(moduleId));
                },
              },
            ],
          },
        },
      });
    })();

    if (lambdaAsset.metadata.afterBuild) {
      await lambdaAsset.metadata.afterBuild(outputPath);
    }

    const asset = new TerraformAsset(scope, `${metadata.filename}-asset`, {
      path: outputPath,
      type: AssetType.ARCHIVE,
    });

    return asset;
  }

  private getPrebuildPath(foldername: string, filename: string) {
    return join(foldername, `${filename}.js`);
  }

  private createOutputPath(path: string) {
    return join(cwd(), '.out', createSha256(path));
  }
}

export const lambdaAssets = new LambdaAssets();
