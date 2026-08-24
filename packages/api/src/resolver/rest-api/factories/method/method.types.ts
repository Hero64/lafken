import type { ClassResource } from '@lafken/common';

import type {
  ApiLambdaMetadata,
  ApiResourceMetadata,
  MethodSettings,
} from '../../../../main';
import type { CorsOptions } from '../../../resolver.types';
import type { ParamHelper } from './helpers/param/param';

export interface CreateMethodProps {
  handler: ApiLambdaMetadata;
  resourceMetadata: ApiResourceMetadata;
  classResource: ClassResource;
  cors?: CorsOptions;
}

export interface MethodSettingsEntry {
  methodName: string;
  methodPath: string;
  /**
   * Stage this settings block is scoped to. When `undefined`, the settings
   * apply to every configured stage.
   */
  stageName?: string;
  settings: MethodSettings;
}

export interface RegisterMethodSettingsProps
  extends Pick<CreateMethodProps, 'handler' | 'resourceMetadata'> {
  fullPath: string;
  methodName: string;
}

export interface AddDocumentationProps extends RegisterMethodSettingsProps {
  paramHelper: ParamHelper;
}
