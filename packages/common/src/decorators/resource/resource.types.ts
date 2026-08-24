export enum ResourceReflectKeys {
  resource = 'resource',
}

export interface BundlerConfig {
  /**
   * Enables minification for this resource's Lambda bundle.
   *
   * When `true`, the bundled code will be minified to reduce deployment
   * package size and improve cold start times.
   */
  minify?: boolean;
  /**
   * Additional packages to exclude from the rolldown bundle.
   *
   * Specifies extra package names or patterns that should be treated as
   * external during bundling. The default externals (`@aws-sdk/*`, `aws-lambda`,
   * `node:*`) are always included — this list is merged on top of them.
   *
   * Values from the app, module, and resource levels are all accumulated.
   *
   * @example
   * externalPackages: ['my-shared-lib', /^@my-org\//]
   */
  externalPackages?: (string | RegExp)[];
}

export interface ResourceProps {
  /**
   * Resource name.
   *
   * Specifies the name of the resource. This name is used to identify
   * the resource within the application, stack, or deployment.
   */
  name?: string;
  /**
   * Bundler configuration for this resource.
   *
   * Groups build-time settings that control how the Lambda code is bundled
   * by rolldown. Includes minification and external package exclusions.
   */
  bundler?: BundlerConfig;
}

export interface ResourceMetadata extends Required<Omit<ResourceProps, 'bundler'>> {
  type: string;
  filename: string;
  foldername: string;
  originalName: string;
  bundler?: BundlerConfig;
}

export interface ResourceDecoratorProps<T> {
  type: string;
  callerFileIndex?: number;
  getMetadata?: (props: T) => T;
}
