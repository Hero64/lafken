import { createFieldDecorator } from '@lafken/common';

import type { BodyParamProps } from '../../request';
import { RESOURCE_TYPE } from '../../type/type';
import type { ResponseFieldMetadata } from './field.types';

export const RESPONSE_PREFIX = `${RESOURCE_TYPE}_RESPONSE` as const;

export const ResField =
  <T, P extends keyof T>(props?: BodyParamProps<T[P]> & { template?: string }) =>
  (target: T, destination: P): void => {
    createFieldDecorator<
      BodyParamProps<T[P]> & { template?: string },
      ResponseFieldMetadata
    >({
      prefix: RESPONSE_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
        };
      },
    })(props)(target, destination as string);
  };
