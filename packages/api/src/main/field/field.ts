import 'reflect-metadata';
import { createFieldDecorator } from '@alicanto/common';

import { ApiReflectKeys } from '../api';
import type {
  ApiFieldMetadata,
  ApiFieldProps,
  ParamMetadata,
  ParamProps,
} from './field.types';

export const Field = createFieldDecorator<ApiFieldProps, ApiFieldMetadata>(
  (props, field) => ({
    ...field,
    required: props.required ?? true,
  }),
  ApiReflectKeys.FIELD,
  ApiReflectKeys.PAYLOAD
);

export const Param = createFieldDecorator<ParamProps, ParamMetadata>(
  (props, field) => ({
    ...field,
    source: props.source ?? 'query',
    required: props.required ?? true,
  }),
  ApiReflectKeys.FIELD,
  ApiReflectKeys.PAYLOAD
);
