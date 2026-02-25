import {
  createFieldName,
  createPayloadDecorator,
  FieldProperties,
  getEventFields,
} from '@lafken/common';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import { RESPONSE_PREFIX, type ResponseFieldMetadata } from './field';
import type { ResponseMetadata, ResponseProps } from './response.types';

export const apiResponseKey = createFieldName(RESPONSE_PREFIX, FieldProperties.payload);

export const ResponseObject = createPayloadDecorator({
  prefix: RESPONSE_PREFIX,
  createUniqueId: true,
});

export const ApiResponse = createPayloadDecorator<ResponseProps, ResponseMetadata>({
  createUniqueId: true,
  prefix: RESPONSE_PREFIX,
  getMetadata: (props) => {
    if (!props?.responses) {
      return {
        defaultCode: props?.defaultCode,
      };
    }

    const responses: Partial<Record<string, ResponseFieldMetadata | true>> = {};

    for (const responseCode in props?.responses) {
      const code = responseCode as unknown as HTTP_STATUS_CODE_NUMBER;
      responses[code] = true;

      if (props.responses[code] !== true) {
        responses[code] = getEventFields(
          RESPONSE_PREFIX,
          props.responses[code],
          'response'
        ) as ResponseFieldMetadata;
      }
    }

    return {
      responses,
      defaultCode: props?.defaultCode,
    };
  },
});
