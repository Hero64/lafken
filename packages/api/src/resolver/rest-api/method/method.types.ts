import type { ClassResource } from '@alicanto/common';

import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../main';
import type { CorsOptions } from '../../resolver.types';
import type { RestApi } from '../rest-api';

export interface ApiMethodProps {
  restApi: RestApi;
  handler: ApiLambdaMetadata;
  resourceMetadata: ApiResourceMetadata;
  classResource: ClassResource;
  cors?: CorsOptions;
}
