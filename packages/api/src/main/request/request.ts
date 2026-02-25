import { createFieldName, createPayloadDecorator, FieldProperties } from '@lafken/common';
import { PARAM_PREFIX } from './params';

export const apiRequestKey = createFieldName(PARAM_PREFIX, FieldProperties.payload);

export const ApiRequest = createPayloadDecorator({
  prefix: PARAM_PREFIX,
  createUniqueId: true,
});

export const RequestObject = ApiRequest;
