import { createFieldName, createPayloadDecorator, FieldProperties } from '@lafken/common';
import { RESOURCE_TYPE } from '../api';

export const apiPayloadKey = createFieldName(RESOURCE_TYPE, FieldProperties.payload);

export const ApiRequest = createPayloadDecorator({
  prefix: RESOURCE_TYPE,
  createUniqueId: true,
});

export const RequestObject = ApiRequest;
