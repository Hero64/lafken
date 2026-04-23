import type { LambdaMetadata, LambdaProps } from '@lafken/common';

export const RESOURCE_TYPE = 'standalone';

export interface HandlerProps {
  name?: string;
  invocatorService?: string;
  lambda?: LambdaProps;
}

export interface HandlerMetadata extends Omit<HandlerProps, 'name'>, LambdaMetadata {}
