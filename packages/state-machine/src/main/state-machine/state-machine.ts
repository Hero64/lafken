import 'reflect-metadata';
import {
  createLambdaDecorator,
  createResourceDecorator,
  LambdaArgumentTypes,
} from '@alicanto/common';

import {
  type DefaultMethod,
  type LambdaStateMetadata,
  type LambdaStateProps,
  type NestedStateMachineResourceProps,
  type StateMachineBaseProps,
  StateMachineReflectKeys,
  type StateMachineResourceProps,
} from './state-machine.types';

export const RESOURCE_TYPE = 'STATE_MACHINE';

export const NestedStateMachine =
  <T extends Function>(props: StateMachineBaseProps<keyof T['prototype']>) =>
  (constructor: T) =>
    createResourceDecorator<NestedStateMachineResourceProps<keyof T['prototype']>>({
      type: StateMachineReflectKeys.nested,
      callerFileIndex: 6,
    })(props)(constructor);

export const StateMachine =
  <T extends Function>(props: StateMachineResourceProps<keyof T['prototype']>) =>
  (constructor: T) =>
    createResourceDecorator<StateMachineResourceProps<keyof T['prototype']>>({
      type: RESOURCE_TYPE,
      callerFileIndex: 6,
    })(props)(constructor);

export const State =
  <T extends Record<K, DefaultMethod>, K extends keyof T>(props?: LambdaStateProps<T>) =>
  (target: T, methodName: K, descriptor: PropertyDescriptor) => {
    return createLambdaDecorator<LambdaStateProps<T>, LambdaStateMetadata<T>>({
      getLambdaMetadata: (props) => ({
        ...props,
        name: methodName as string,
      }),
      argumentParser: {
        [LambdaArgumentTypes.event]: ({ event }) => event.Payload, // TODO: verfificar si estó es necesatio
      },
    })(props)(target, methodName as string, descriptor);
  };
