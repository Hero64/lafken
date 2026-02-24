import { createFieldDecorator } from '@lafken/common';
import { RESOURCE_TYPE } from '../../api';
import type { BodyParamProps } from '../../request';
import type { ResponseFieldMetadata } from './field.types';

export const ResField =
  <T, P extends keyof T>(props?: BodyParamProps<T[P]>) =>
  (target: T, destination: P): void => {
    createFieldDecorator<BodyParamProps<T[P]>, ResponseFieldMetadata>({
      prefix: RESOURCE_TYPE,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
        };
      },
    })(props)(target, destination as string);
  };
