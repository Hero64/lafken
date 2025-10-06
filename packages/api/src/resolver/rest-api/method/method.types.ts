import type { ClassResource } from '@alicanto/common';

import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../main';
import type { RestApi } from '../rest-api';

export interface ApiMethodProps {
  restApi: RestApi;
  handler: ApiLambdaMetadata;
  resourceMetadata: ApiResourceMetadata;
  classResource: ClassResource;
}
