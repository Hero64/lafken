import {
  createEventDecorator,
  createPayloadDecorator,
  getEventFields,
} from '@alicanto/common';

import type { ApiFieldMetadata } from '../field';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import type { ResponseMetadata, ResponseProps } from './event.types';

export const Response = createPayloadDecorator<ResponseProps, ResponseMetadata>({
  createUniqueId: true,
  getMetadata: (props) => {
    if (!props?.responses) {
      return {
        defaultCode: props?.defaultCode,
      };
    }

    const responses: Partial<Record<string, ApiFieldMetadata | true>> = {};

    for (const responseCode in props?.responses) {
      const code = responseCode as unknown as HTTP_STATUS_CODE_NUMBER;
      responses[code] = true;

      if (props.responses[code] !== true) {
        responses[code] = getEventFields(
          props.responses[code],
          'response'
        ) as ApiFieldMetadata;
      }
    }

    return {
      responses,
      defaultCode: props?.defaultCode,
    };
  },
});

export const Payload = createPayloadDecorator({
  createUniqueId: true,
});

export const Event = (target: Function) => createEventDecorator()(target);
