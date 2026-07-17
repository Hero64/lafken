import type { LambdaFunction } from '@cdktn/provider-aws/lib/lambda-function';
import type { ResourceMetadata } from '@lafken/common';
import type { Construct } from 'constructs';

export interface HandlerMethod {
  name: string;
  /**
   * When true, the exported handler is wrapped with
   * `awslambda.streamifyResponse` at build time so the Lambda runtime treats it
   * as a response-streaming handler.
   */
  streaming?: boolean;
}

export interface AssetResource {
  className: string;
  methods: HandlerMethod[];
}

export interface AssetFileMetadata
  extends Pick<ResourceMetadata, 'filename' | 'foldername' | 'bundler'> {
  afterBuild?: (outputPath: string) => void;
}

export interface InitializeAssetProps {
  asset: AssetFileMetadata;
  resource: AssetResource;
}

export interface AssetProps {
  metadata: AssetFileMetadata;
  resources: Record<string, AssetResource>;
  scope?: Construct;
  lambdas: LambdaFunction[];
}

export interface BuildAssetProps {
  scope: Construct;
  metadata: AssetFileMetadata;
}

export interface AddLambdaProps
  extends Pick<AssetFileMetadata, 'filename' | 'foldername'> {
  lambda: LambdaFunction;
  scope: Construct;
}
