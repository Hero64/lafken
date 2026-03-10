import 'reflect-metadata';
import {
  Context,
  createLambdaDecorator,
  createResourceDecorator,
  getEventFields,
} from '@lafken/common';
import { RESPONSE_PREFIX, type ResponseFieldMetadata } from '../response';
import { RESOURCE_TYPE } from '../type/type';
import {
  type ApiLambdaBaseProps,
  type ApiLambdaIntegrationProps,
  type ApiLambdaMetadata,
  type ApiLambdaProps,
  type ApiProps,
  Method,
} from './api.types';

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
        RESPONSE_PREFIX,
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

/**
 * Class decorator that registers a class as a REST API resource.
 *
 * Defines a base path and shared configuration (authentication, API Gateway target)
 * for all HTTP method handlers declared inside the class.
 *
 * @example
 * ```ts
 * @Api({ path: '/users' })
 * export class UserApi {
 *   @Get({ path: '/{id}' })
 *   getUser() { return { id: 1 }; }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Disable authentication for all methods in this resource
 * @Api({ path: '/public', auth: false })
 * export class PublicApi { }
 * ```
 *
 * @param props - Configuration options (path, auth, apiGatewayName).
 */
export const Api = createResourceDecorator<ApiProps>({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
  getMetadata: ({ path, auth, apiGatewayName }) => ({
    auth,
    apiGatewayName,
    path: path || '/',
  }),
});

/**
 * Method decorator that registers a handler for HTTP **GET** requests.
 *
 * Use it to expose read-only endpoints. The method path is appended
 * to the base path defined in the `@Api` class decorator.
 *
 * @example
 * ```ts
 * @Get({ path: '/{id}' })
 * getUser() { return { id: 1, name: 'Alice' }; }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Get = createMethodDecorator(Method.GET);

/**
 * Method decorator that registers a handler for HTTP **POST** requests.
 *
 * Use it to expose endpoints that create new resources or trigger actions.
 *
 * @example
 * ```ts
 * @Post({ path: '/' })
 * createUser() { return { created: true }; }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Post = createMethodDecorator(Method.POST);

/**
 * Method decorator that registers a handler for HTTP **PUT** requests.
 *
 * Use it to expose endpoints that fully replace an existing resource.
 *
 * @example
 * ```ts
 * @Put({ path: '/{id}' })
 * replaceUser() { return { replaced: true }; }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Put = createMethodDecorator(Method.PUT);

/**
 * Method decorator that registers a handler for HTTP **PATCH** requests.
 *
 * Use it to expose endpoints that partially update an existing resource.
 *
 * @example
 * ```ts
 * @Patch({ path: '/{id}' })
 * updateUser() { return { updated: true }; }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Patch = createMethodDecorator(Method.PATCH);

/**
 * Method decorator that registers a handler for HTTP **DELETE** requests.
 *
 * Use it to expose endpoints that remove an existing resource.
 *
 * @example
 * ```ts
 * @Delete({ path: '/{id}' })
 * removeUser() { return { deleted: true }; }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Delete = createMethodDecorator(Method.DELETE);

/**
 * Method decorator that registers a handler for HTTP **HEAD** requests.
 *
 * Use it to expose endpoints that return only headers (no body),
 * typically for existence checks or metadata retrieval.
 *
 * @example
 * ```ts
 * @Head({ path: '/{id}' })
 * checkUser() { }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Head = createMethodDecorator(Method.HEAD);

/**
 * Method decorator that registers a handler for **any** HTTP method.
 *
 * Use it as a catch-all when the endpoint should respond to every
 * HTTP verb (GET, POST, PUT, PATCH, DELETE, HEAD, etc.).
 *
 * @example
 * ```ts
 * @Any({ path: '/proxy' })
 * proxyRequest() { }
 * ```
 *
 * @param props - Method options (path, auth, response, description, integration, lambda).
 */
export const Any = createMethodDecorator(Method.ANY);

/**
 * Parameter decorator that injects the API Gateway integration options
 * into a handler method argument.
 *
 * Provides access to the underlying request context, such as headers,
 * query parameters, and path parameters forwarded by API Gateway.
 *
 * @example
 * ```ts
 * @Get({ path: '/{id}' })
 * getUser(@IntegrationOptions() ctx: any) {
 *   const userId = ctx.pathParameters.id;
 * }
 * ```
 */
export const IntegrationOptions = Context;
