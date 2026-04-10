import type { ClassResource } from '@lafken/common';

import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../../../main';
import type { CorsOptions } from '../../../resolver.types';
import type { ParamHelper } from './helpers/param/param';

export interface CreateMethodProps {
  handler: ApiLambdaMetadata;
  resourceMetadata: ApiResourceMetadata;
  classResource: ClassResource;
  cors?: CorsOptions;
}

export interface AddDocumentationProps
  extends Pick<CreateMethodProps, 'handler' | 'resourceMetadata'> {
  fullPath: string;
  methodName: string;
  paramHelper: ParamHelper;
}
