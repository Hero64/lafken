import { isBuildEnvironment } from '../../utils';
import { FieldProperties } from '../field';
import type {
  CreatePayloadDecoratorProps,
  PayloadMetadata,
  PayloadProps,
} from './payload.types';

const payloadIds: Record<string, number> = {};

export const createPayloadDecorator =
  <T extends PayloadProps, M>({
    getMetadata,
    createUniqueId = false,
    enableInLambdaInvocation = false,
  }: CreatePayloadDecoratorProps<T, M>) =>
  (props?: T) =>
  (target: Function) => {
    if (!isBuildEnvironment() && !enableInLambdaInvocation) {
      return;
    }

    const { name = target.name } = props || {};
    let id = name;
    if (createUniqueId) {
      payloadIds[name] ??= 0;
      if (payloadIds[name] > 0) {
        id = `${name}_${payloadIds[name]}`;
      }
      payloadIds[name]++;
    }

    let payloadMetadata: PayloadMetadata = {
      id,
      name,
    };

    if (getMetadata) {
      payloadMetadata = {
        ...payloadMetadata,
        ...getMetadata(props),
      };
    }

    Reflect.defineMetadata(FieldProperties.payload, payloadMetadata, target);
  };
