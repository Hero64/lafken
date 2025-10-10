import 'reflect-metadata';
import { isBuildEnvironment } from '../../utils';
import { type AllowedTypes, getEventFields } from '../field';
import {
  type CallbackParam,
  type CreateLambdaDecoratorProps,
  type LambdaArguments,
  type LambdaArgumentsType,
  LambdaArgumentTypes,
  LambdaReflectKeys,
} from './lambda.types';

const argumentsByType: LambdaArgumentsType = {
  [LambdaArgumentTypes.event]: ({ event }) => event,
  [LambdaArgumentTypes.callback]: ({ callback }) => callback,
  [LambdaArgumentTypes.context]: ({ context }) => context,
};

export const reflectArgumentMethod = (
  target: Function,
  methodName: string,
  type: LambdaArgumentTypes
) => {
  const properties: LambdaArguments =
    Reflect.getMetadata(LambdaReflectKeys.arguments, target) || {};

  properties[methodName] = [type, ...(properties[methodName] || [])];
  Reflect.defineMetadata(LambdaReflectKeys.arguments, properties, target);
};

export const createLambdaDecorator =
  <T, M>({
    getLambdaMetadata,
    descriptorValue,
    argumentParser,
  }: CreateLambdaDecoratorProps<T, M>) =>
  (props?: T) =>
  (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    if (isBuildEnvironment()) {
      const handlersMetadata: M[] =
        Reflect.getMetadata(LambdaReflectKeys.handlers, target) || [];

      Reflect.defineMetadata(
        LambdaReflectKeys.handlers,
        [...handlersMetadata, getLambdaMetadata(props || ({} as T), methodName)],
        target
      );
    }

    const lambdaArguments: LambdaArguments = Reflect.getMetadata(
      LambdaReflectKeys.arguments,
      target
    );

    if (descriptorValue) {
      return descriptorValue(descriptor);
    }

    const { value: originalValue } = descriptor;

    const mapArgumentMethod = {
      ...argumentsByType,
      ...argumentParser,
    };

    descriptor.value = async (event: any, context: any, callback: CallbackParam) => {
      const methodArguments = (lambdaArguments?.[methodName] || []).map((argumentType) =>
        mapArgumentMethod[argumentType]({ event, context, methodName, target, callback })
      );

      const response = await originalValue.apply(this, methodArguments);
      return response;
    };
  };

const reflectEventMetadata = (
  target: any,
  methodName: string,
  key: LambdaReflectKeys,
  data: any
) => {
  const argumentsByMethod = Reflect.getMetadata(key, target) || {};
  Reflect.defineMetadata(
    key,
    {
      ...argumentsByMethod,
      ...(data ? { [methodName]: data } : {}),
    },
    target
  );
};

export const createEventDecorator =
  () =>
  (eventField: AllowedTypes) =>
  (target: any, methodName: string, _number: number) => {
    reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);

    if (!isBuildEnvironment() || !eventField) {
      return;
    }

    const field = getEventFields(eventField);
    reflectEventMetadata(target, methodName, LambdaReflectKeys.event_param, field);
  };

export const Callback = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.callback);
};

export const Context = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.context);
};
