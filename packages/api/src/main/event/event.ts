import 'reflect-metadata';
import { createEventDecorator } from '@lafken/common';
import { PARAM_PREFIX } from '../request';

/**
 * Parameter decorator that binds the incoming API Gateway event
 * to a typed request class on a handler method argument.
 *
 * Pass a class decorated with request-param decorators (`@BodyParam`,
 * `@QueryParam`, `@PathParam`, `@HeaderParam`, `@ContextParam`) so the
 * framework can automatically extract and map each field from the raw
 * event into a strongly-typed object at runtime.
 *
 * @param target - The request class whose fields describe the expected
 *                 event structure.
 *
 * @example
 * ```ts
 * @ApiRequest
 * class CreateUserRequest {
 *   @BodyParam()
 *   name: string;
 *
 *   @QueryParam()
 *   role: string;
 * }
 *
 * @Api({ path: '/users' })
 * export class UserApi {
 *   @Post()
 *   createUser(@Event(CreateUserRequest) req: CreateUserRequest) {
 *     // req.name  → extracted from the request body
 *     // req.role  → extracted from the query string
 *   }
 * }
 * ```
 */
export const Event = (target: Function) =>
  createEventDecorator({ prefix: PARAM_PREFIX })(target);

/**
 * Reflect-metadata key under which handlers that use `@EventProxy` are flagged
 * (per method name) on the class prototype. The resolver reads it to enforce
 * that `@EventProxy` is only used with `integrationType: 'aws-proxy'`.
 */
export const EVENT_PROXY_METADATA_KEY = 'api:event_proxy';

/**
 * Parameter decorator for Lambda **proxy** integrations
 * (`@Get({ integrationType: 'aws-proxy' })`). Unlike `@Event`, the handler
 * argument receives the **complete** `APIGatewayProxyEvent` at runtime (API
 * Gateway forwards the raw request; there is no VTL request template), so the
 * handler is responsible for reading `event.body`, `event.pathParameters`, etc.
 *
 * The optional request class is used only to generate the **input model**
 * (OpenAPI request-body schema + API Gateway request validation), exactly like
 * `@Event`. It does not change the runtime value delivered to the handler.
 *
 * Can only be used when the method declares `integrationType: 'aws-proxy'`;
 * using it under the default `'aws'` integration fails at synth.
 *
 * @param target - Optional request class describing the input model.
 *
 * @example
 * ```ts
 * @Api({ path: '/chat' })
 * export class ChatApi {
 *   @Streaming()
 *   @Post({ integrationType: 'aws-proxy' })
 *   stream(
 *     @EventProxy(ChatRequest) event: APIGatewayProxyEvent,
 *     @ResponseStreaming() stream: Writable,
 *   ) {
 *     const body = JSON.parse(event.body ?? '{}');
 *     stream.write('...');
 *     stream.end();
 *   }
 * }
 * ```
 */
export const EventProxy =
  (target?: Function) => (prototype: any, methodName: string, parameterIndex: number) => {
    createEventDecorator({ prefix: PARAM_PREFIX, enableInLambdaInvocation: true })(
      target as Function
    )(prototype, methodName, parameterIndex);

    const proxyMethods: Record<string, boolean> =
      Reflect.getMetadata(EVENT_PROXY_METADATA_KEY, prototype) || {};

    Reflect.defineMetadata(
      EVENT_PROXY_METADATA_KEY,
      { ...proxyMethods, [methodName]: true },
      prototype
    );
  };
