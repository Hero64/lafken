import 'reflect-metadata';
import {
  Context,
  createLambdaDecorator,
  createResourceDecorator,
  getEventFields,
  LambdaReflectKeys,
} from '@lafken/common';
import { type ApiObjectMetadata, PARAM_PREFIX, type Source } from '../request';
import { RESPONSE_PREFIX, type ResponseFieldMetadata } from '../response';
import { objectToSchema } from '../schema/schema';
import { response } from '../status';
import { RESOURCE_TYPE } from '../type/type';
import { SchemaValidator } from '../validator/validators';
import {
  type ApiLambdaBaseProps,
  type ApiLambdaIntegrationProps,
  type ApiLambdaMetadata,
  type ApiLambdaProps,
  type ApiProps,
  Method,
} from './api.types';

const unvalidatedSources = new Set<Source>(['path', 'query', 'header']);

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
        summary: params.summary,
        tags: params.tags,
      } as ApiLambdaMetadata;
    },
    validateEvent: (target, methodName, event) => {
      const eventByMethod =
        Reflect.getMetadata(LambdaReflectKeys.event_class, target) || {};

      const eventClass = eventByMethod[methodName];

      if (!eventClass) {
        return;
      }

      const fields = getEventFields(PARAM_PREFIX, eventClass) as ApiObjectMetadata;

      const unvalidatedParameters = fields.properties.filter((p) =>
        unvalidatedSources.has(p.source)
      );

      if (unvalidatedParameters.length === 0) {
        return;
      }

      const validator = new SchemaValidator();

      const validations = validator.validate(
        event,
        objectToSchema({
          type: 'Object',
          destinationName: fields.destinationName,
          name: fields.name,
          payload: fields.payload,
          source: 'body',
          properties: unvalidatedParameters,
        })
      );

      if (validations.valid) {
        return validations;
      }

      response(400, {
        message: validations.validationErrorString,
      });
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
  getMetadata: ({ path, auth, apiGatewayName, tags }) => ({
    auth,
    tags,
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
