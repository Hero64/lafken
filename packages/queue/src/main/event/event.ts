import {
  createEventDecorator,
  createFieldDecorator,
  createPayloadDecorator,
} from '@alicanto/common';
import type { ParamProps, QueueParamMetadata } from './event.types';

export const Payload = createPayloadDecorator({
  createUniqueId: false,
  enableInLambdaInvocation: true,
});

export const Param = createFieldDecorator<ParamProps, QueueParamMetadata>({
  enableInLambdaInvocation: true,
  getMetadata: (props) => {
    const source = props?.source || 'attribute';

    return {
      source,
      parse: props?.source === 'body' && !!props?.parse,
    };
  },
});

export const Field = createFieldDecorator({
  getMetadata: () => ({}),
});

export const Event = (eventField: Function) => createEventDecorator()(eventField);
