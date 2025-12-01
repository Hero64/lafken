import { LambdaArgumentTypes, reflectArgumentMethod } from '@alicanto/common';

export const Event = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.event);
};
