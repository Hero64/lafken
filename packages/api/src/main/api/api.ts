import 'reflect-metadata';
import {
  Context,
  createLambdaDecorator,
  createResourceDecorator,
  getEventFields,
} from '@alicanto/common';

import {
  type ApiLambdaBaseProps,
  type ApiLambdaIntegrationProps,
  type ApiLambdaMetadata,
  type ApiLambdaProps,
  type ApiProps,
  Method,
  type ResponseFieldMetadata,
} from './api.types';

export const RESOURCE_TYPE = 'REST_API';

const createMethodDecorator = (method: Method) =>
  createLambdaDecorator<ApiLambdaProps, ApiLambdaMetadata>({
    getLambdaMetadata: (params, methodName) => {
      const { path = '/' } = params;
      let action: string | undefined;

      if (params.integration) {
        action = params.action;
      }

      const responseHandler = params as ApiLambdaBaseProps;

      const responseParams = getEventFields(
        responseHandler.response
      ) as ResponseFieldMetadata;

      return {
        lambda: (params as ApiLambdaIntegrationProps).lambda,
        method,
        path,
        action,
        name: methodName,
        auth: params.auth,
        response: responseParams,
        description: params.description,
        integration: params.integration,
      } as ApiLambdaMetadata;
    },
  });

export const Api = createResourceDecorator<ApiProps>({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
  getMetadata: ({ path, auth, apiGatewayName }) => ({
    auth,
    apiGatewayName,
    path: path || '/',
  }),
});

export const Get = createMethodDecorator(Method.GET);
export const Post = createMethodDecorator(Method.POST);
export const Put = createMethodDecorator(Method.PUT);
export const Patch = createMethodDecorator(Method.PATCH);
export const Delete = createMethodDecorator(Method.DELETE);
export const Head = createMethodDecorator(Method.HEAD);
export const Any = createMethodDecorator(Method.ANY);

export const IntegrationOptions = Context;
