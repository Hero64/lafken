import 'reflect-metadata';
import { createFieldDecorator } from '@alicanto/common';

import type { ApiFieldMetadata, ApiFieldProps, ApiParamMetadata } from './field.types';

export const Field = createFieldDecorator<ApiFieldProps, ApiFieldMetadata>({
  getMetadata: (props) => {
    return {
      validation: {
        ...(props?.validation || {}),
        required: props?.validation?.required || true,
      },
    };
  },
});

export const Param = createFieldDecorator<ApiFieldProps, ApiParamMetadata>({
  getMetadata: (props) => {
    return {
      source: props?.source || 'query',
      validation: {
        ...(props?.validation || {}),
        required: props?.validation?.required || true,
      },
    };
  },
});
