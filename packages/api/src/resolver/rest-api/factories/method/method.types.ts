import type { ClassResource } from '@alicanto/common';

import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../main';
import type { CorsOptions } from '../../../resolver.types';

export interface CreateMethodProps {
  handler: ApiLambdaMetadata;
  resourceMetadata: ApiResourceMetadata;
  classResource: ClassResource;
  cors?: CorsOptions;
}
