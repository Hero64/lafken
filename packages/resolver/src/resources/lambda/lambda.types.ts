import type { LambdaMetadata } from '@alicanto/common';

export interface LambdaHandlerProps extends LambdaMetadata {
  pathName: string;
  filename: string;
  suffix?: string;
  excludeFiles?: string[];
  principal?: string;
  minify?: boolean;
}
