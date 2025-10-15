import { createLambdaDecorator, createResourceDecorator } from '@alicanto/common';
import type {
  EventCronMetadata,
  EventCronProps,
  EventRuleMetadata,
  EventRuleProps,
} from './rule.types';

export const RESOURCE_TYPE = 'EVENT';

export const EventRule = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

export const Rule = (props: EventRuleProps) =>
  createLambdaDecorator<EventRuleProps, EventRuleMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
      eventType: 'rule',
    }),
  })(props);

export const Cron = (props: EventCronProps) =>
  createLambdaDecorator<EventCronProps, EventCronMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
      eventType: 'cron',
    }),
  })(props);
