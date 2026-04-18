import 'reflect-metadata';
import { isBuildEnvironment } from '../../utils';
import { type AllowedTypes, getEventFields } from '../field';
import {
  type CreateEventDecoratorProps,
  type CreateLambdaDecoratorProps,
  type LambdaArguments,
  type LambdaArgumentsType,
  LambdaArgumentTypes,
  LambdaReflectKeys,
} from './lambda.types';

const argumentsByType: LambdaArgumentsType = {
  [LambdaArgumentTypes.event]: ({ event }) => event,
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
    validateEvent,
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

    descriptor.value = async function (event: any, context: any) {
      if (!isBuildEnvironment() && event && validateEvent) {
        validateEvent(target, methodName, event);
      }

      const methodArguments = (lambdaArguments?.[methodName] || []).map((argumentType) =>
        mapArgumentMethod[argumentType]({ event, context, methodName, target })
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
  ({ enableInLambdaInvocation = false, prefix }: CreateEventDecoratorProps) =>
  (eventField: AllowedTypes) =>
  (target: any, methodName: string, _number: number) => {
    reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);

    if (!eventField || (!enableInLambdaInvocation && !isBuildEnvironment())) {
      if (eventField) {
        reflectEventMetadata(
          target,
          methodName,
          LambdaReflectKeys.event_class,
          eventField
        );
      }
      return;
    }

    const field = getEventFields(prefix, eventField);
    reflectEventMetadata(target, methodName, LambdaReflectKeys.event_param, field);
  };

export const Context = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.context);
};
