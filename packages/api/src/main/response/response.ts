import { createPayloadDecorator, getEventFields } from '@lafken/common';
import { RESOURCE_TYPE } from '../api';
import { RequestObject } from '../request';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import type { ResponseFieldMetadata } from './field';
import type { ResponseMetadata, ResponseProps } from './response.types';

export const ResponseObject = RequestObject;

export const ApiResponse = createPayloadDecorator<ResponseProps, ResponseMetadata>({
  createUniqueId: true,
  prefix: RESOURCE_TYPE,
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
          RESOURCE_TYPE,
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
