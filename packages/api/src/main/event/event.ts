import { createEventDecorator } from '@lafken/common';
import { RESOURCE_TYPE } from '../api';

export const Event = (target: Function) =>
  createEventDecorator({ prefix: RESOURCE_TYPE })(target);
