import { createLambdaDecorator, createResourceDecorator } from '@alicanto/common';
import type { EventRuleMetadata, EventRuleProps } from './rule.types';

export const RESOURCE_TYPE = 'EVENT' as const;

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
