import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { AssetType, TerraformAsset } from 'cdktn';

import { createSha1 } from '../../../utils';
import { LafkenBuildPlugin } from '../build-plugin/build-plugin';
import type {
  AddLambdaProps,
  AssetMetadata,
  AssetProps,
  BuildAssetProps,
} from './asset.types';

class LambdaAssets {
  private lambdaAssets: Record<string, AssetProps> = {};

  public initializeMetadata(props: AssetMetadata) {
    const { filename, foldername, className, methods } = props;

    const prebuildPath = this.getPrebuildPath(foldername, filename);
    if (!this.lambdaAssets[prebuildPath]) {
      this.lambdaAssets[prebuildPath] = {
        metadata: {
          filename,
          foldername,
          minify: props.minify,
          afterBuild: props.afterBuild,
        },
        resources: {},
        lambdas: [],
      };
    }

    this.lambdaAssets[prebuildPath].resources[className] = {
      className,
      methods,
    };
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

    (async () => {
      const { build } = await import('rolldown');

      await build({
        input: prebuildPath,
        platform: 'node',
        external: ['@aws-sdk', 'aws-lambda'],
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
          minify: metadata.minify,
          legalComments: 'none',
          advancedChunks: {
            groups: [
              {
                name(moduleId) {
                  if (prebuildPath === moduleId) {
                    return null;
                  }

                  return 'vendor';
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
    return join(cwd(), '.out', createSha1(path));
  }
}

export const lambdaAssets = new LambdaAssets();
