import { join } from 'node:path';
import { cwd } from 'node:process';
import { AssetType, TerraformAsset } from 'cdktf';
import type { Construct } from 'constructs';
import { build } from 'esbuild';
import { createSha1 } from '../../../utils';
import { AlicantoBuildPlugin } from '../build-plugin/build-plugin';
import type { AssetMetadata, AssetProps, BuildHandlerProps } from './asset.types';

class LambdaAssets {
  private lambdaAssets: Record<string, AssetProps> = {};

  public initializeMetadata(pathName: string, filename: string, metadata: AssetMetadata) {
    const prebuildPath = this.getPrebuildPath(pathName, filename);
    this.lambdaAssets[prebuildPath] = {
      metadata,
    };
  }

  public async buildHandler(scope: Construct, props: BuildHandlerProps) {
    const prebuildPath = this.getPrebuildPath(props.pathName, props.filename);

    const lambdaAsset = this.lambdaAssets[prebuildPath];

    if (lambdaAsset.asset) {
      return lambdaAsset.asset;
    }

    const outputPath = this.createOutputPath(prebuildPath);

    await build({
      entryPoints: [prebuildPath],
      outfile: join(outputPath, 'index.js'),
      legalComments: 'none',
      bundle: true,
      minify: props.minify,
      platform: 'node',
      external: ['@aws-sdk', 'aws-lambda'],
      plugins: [
        AlicantoBuildPlugin({
          filename: props.filename,
          removeAttributes: ['lambda'],
          export: lambdaAsset.metadata,
        }),
      ],
    });

    const asset = new TerraformAsset(scope, `${props.filename}-asset`, {
      path: outputPath,
      type: AssetType.ARCHIVE,
    });

    this.lambdaAssets[prebuildPath].asset = asset;

    return asset;
  }

  private getPrebuildPath(pathName: string, filename: string) {
    return join(pathName, `${filename}.js`);
  }

  private createOutputPath(path: string) {
    return join(cwd(), '.out', createSha1(path));
  }
}

export const lambdaAssets = new LambdaAssets();
