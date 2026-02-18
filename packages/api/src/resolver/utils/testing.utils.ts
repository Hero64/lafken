import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { lafkenResource } from '@lafken/resolver';
import { TerraformStack, Testing } from 'cdktn';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '../../main';
import type { RestApiProps } from '../resolver.types';
import { RestApi } from '../rest-api/rest-api';

export const setupTestingRestApi = (props: Omit<RestApiProps, 'name'> = {}) => {
  const app = Testing.app();

  const AppStack = lafkenResource.make(TerraformStack);

  const stack = new AppStack(app, 'testing-stack');
  stack.isGlobal('app', 'testing-stack');

  const restApi = new RestApi(stack, 'testing-api', {
    ...props,
    name: 'testing-rest-api',
  });

  return {
    app,
    stack,
    restApi,
  };
};

export const initializeMethod = async (
  restApi: RestApi,
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
