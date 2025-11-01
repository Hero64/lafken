import { basename, dirname } from 'node:path';

import { isBuildEnvironment } from '../../utils';
import { getCallerFileName } from '../../utils/path.utils';
import {
  type ResourceDecoratorProps,
  type ResourceProps,
  ResourceReflectKeys,
} from './resource.types';

export const createResourceDecorator =
  <T extends ResourceProps>(decoratorProps: ResourceDecoratorProps<T>) =>
  (props?: T) =>
  (constructor: Function) => {
    if (!isBuildEnvironment()) {
      return;
    }

    const { type, callerFileIndex, getMetadata = () => props } = decoratorProps;
    const additionalMetadata = getMetadata(props || ({} as T));
    const callerFile = getCallerFileName(callerFileIndex);
    Reflect.defineMetadata(
      ResourceReflectKeys.resource,
      {
        ...additionalMetadata,
        type,
        name: props?.name || constructor.name,
        foldername: dirname(callerFile),
        filename: basename(callerFile).replace('.js', ''),
        originalName: constructor.name,
        minify: props?.minify ?? true,
      },
      constructor
    );
  };
