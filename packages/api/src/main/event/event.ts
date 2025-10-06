import {
  createEventDecorator,
  createPayloadDecorator,
  getClassData,
  getMetadataOfType,
} from '@alicanto/common';

import { ApiReflectKeys } from '../api';
import type { HTTP_STATUS_CODE_NUMBER } from '../status';
import type { ResponseMetadata, ResponseProps } from './event.types';

export const Response = createPayloadDecorator<ResponseProps, ResponseMetadata>(
  (props, metadata) => {
    const metadataProps: ResponseMetadata = {
      ...metadata,
      defaultCode: props?.defaultCode,
    };

    if (props?.responses) {
      metadataProps.responses = {};
      for (const code in props.responses) {
        const statusCode = code as unknown as HTTP_STATUS_CODE_NUMBER;
        metadataProps.responses[statusCode] = true;

        if (props.responses[statusCode] !== true) {
          metadataProps.responses[statusCode] = getMetadataOfType(
            ApiReflectKeys.FIELD,
            ApiReflectKeys.PAYLOAD,
            props.responses[statusCode]
          );
        }
      }
    }

    return metadataProps;
  },
  ApiReflectKeys.PAYLOAD,
  true
);

export const Payload = createPayloadDecorator(
  (_props, metadata) => metadata,
  ApiReflectKeys.PAYLOAD,
  true
);

export const Event = createEventDecorator((ParamClass) =>
  getClassData(ParamClass, ApiReflectKeys.FIELD, ApiReflectKeys.PAYLOAD)
);
