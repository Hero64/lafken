import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';
import {
  type HandlerMetadata,
  type HandlerProps,
  RESOURCE_TYPE,
} from './standalone.types';

export const Standalone = createResourceDecorator({
  type: RESOURCE_TYPE,
});

export const Handler = createLambdaDecorator<HandlerProps, HandlerMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    name: props.name || methodName,
  }),
});
