import {
  type LambdaArguments,
  LambdaArgumentTypes,
  LambdaReflectKeys,
} from '../decorators';
import type { ClassResource } from '../types';
import { isBuildEnvironment } from './build-env.utils';

type InstanceMethod<
  T extends ClassResource,
  M extends keyof InstanceType<T>,
> = InstanceType<T>[M] extends (...args: any[]) => any ? InstanceType<T>[M] : never;

interface ExecuteLambdaProps<T extends ClassResource, M extends keyof InstanceType<T>> {
  method: M;
  params?: Parameters<InstanceMethod<T, M>>;
}

export const executeLambda = async <
  T extends ClassResource,
  M extends keyof InstanceType<T>,
>(
  classResource: T,
  props: ExecuteLambdaProps<T, M>
): Promise<Awaited<ReturnType<InstanceMethod<T, M>>>> => {
  if (!isBuildEnvironment()) {
    throw new Error(
      'executeLambda: Build environment is not enabled. ' +
        'Call enableBuildEnvVariable() before defining decorated classes.'
    );
  }

  const instance = new classResource() as InstanceType<T>;
  const methodName = props.method as string;

  const lambdaArguments: LambdaArguments =
    Reflect.getMetadata(LambdaReflectKeys.arguments, classResource.prototype) || {};

  const argumentTypes = lambdaArguments[methodName] || [];

  const params = props.params || [];
  let event: any = {};
  let context: any = {};

  argumentTypes.forEach((type, index) => {
    if (type === LambdaArgumentTypes.event) {
      event = params[index] ?? {};
    } else if (type === LambdaArgumentTypes.context) {
      context = params[index] ?? {};
    }
  });

  return (instance as any)[methodName](event, context);
};
