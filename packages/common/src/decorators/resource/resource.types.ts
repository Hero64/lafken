export enum ResourceReflectKeys {
  resource = 'resource',
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
   * Resource minify
   *
   * Specifies whether the code should be minified when the resource is processed
   *
   * @default true
   */
  minify?: boolean;
}

export interface ResourceMetadata extends Required<ResourceProps> {
  type: string;
  filename: string;
  foldername: string;
  originalName: string;
}

export interface ResourceDecoratorProps<T> {
  type: string;
  callerFileIndex?: number;
  getMetadata?: (props: T) => T;
}
