import { createEventDecorator } from '@lafken/common';
import { PARAM_PREFIX } from '../request';

export const Event = (target: Function) =>
  createEventDecorator({ prefix: PARAM_PREFIX })(target);
