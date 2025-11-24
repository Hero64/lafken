import { createLambdaDecorator, createResourceDecorator } from '@alicanto/common';
import type { EventCronMetadata, EventCronProps } from './cron-rule.types';

export const RESOURCE_TYPE = 'CRON' as const;

export const Schedule = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

export const Cron = (props: EventCronProps) =>
  createLambdaDecorator<EventCronProps, EventCronMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
    }),
  })(props);
