import { LambdaArgumentTypes, reflectArgumentMethod } from '@alicanto/common';

export const Event = () => (target: any, methodName: string) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);
};
