import {
  type LambdaMetadata,
  LambdaReflectKeys,
  type ResourceMetadata,
  ResourceReflectKeys,
} from '../decorators';
import type { ClassResource } from '../types';

export const getResourceMetadata = <T = ResourceMetadata>(
  classResource: ClassResource
): T => {
  return Reflect.getMetadata(ResourceReflectKeys.RESOURCE, classResource);
};

export const getResourceHandlerMetadata = <T = LambdaMetadata>(
  classResource: ClassResource
): T[] => {
  return Reflect.getMetadata(LambdaReflectKeys.handlers, classResource.prototype) || [];
};

export const getMetadataByKey = <T>(classResource: ClassResource, key: string): T => {
  return Reflect.getMetadata(key, classResource);
};

export const getMetadataPrototypeByKey = <T>(
  classResource: ClassResource,
  key: string
): T => {
  return Reflect.getMetadata(key, classResource.prototype);
};
