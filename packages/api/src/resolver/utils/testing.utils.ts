import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { TerraformStack, Testing } from 'cdktn';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../main';
import type { ExternalApiProps, RestApiProps } from '../resolver.types';
import { ExternalRestApi } from '../rest-api/external/external';
import { InternalRestApi } from '../rest-api/internal/internal';

export const setupApp = () => {
  const app = Testing.app();

  const AppStack = lafkenResource.make(TerraformStack);

  const stack = new AppStack(app, 'testing-stack');
  stack.isGlobal('app', 'testing-stack');

  return {
    app,
    stack,
  };
};

export const setupInternalTestingRestApi = (props: Omit<RestApiProps, 'name'> = {}) => {
  const { app, stack } = setupApp();

  const restApi = new InternalRestApi(stack, 'testing-api', {
    ...props,
    name: 'testing-rest-api',
  });

  return {
    app,
    stack,
    restApi,
  };
};

export const setupExternalTestingRestApi = (
  props: Omit<ExternalApiProps, 'name' | 'isExternal'> = {}
) => {
  const { app, stack } = setupApp();

  const restApi = new ExternalRestApi(stack, 'testing-api', {
    ...props,
    name: 'testing-rest-api',
    isExternal: true,
  });

  return {
    app,
    stack,
    restApi,
  };
};

export const initializeMethod = async (
  restApi: InternalRestApi,
  stack: TerraformStack,
  classResource: ClassResource,
  handlerName: string
) => {
  const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(classResource);
  const resourceMetadata = getResourceMetadata<ApiResourceMetadata>(classResource);

  const handler = handlers.find((h) => h.name === handlerName) as ApiLambdaMetadata;

  await restApi.addMethod(stack, {
    classResource,
    handler,
    resourceMetadata,
  });
};
