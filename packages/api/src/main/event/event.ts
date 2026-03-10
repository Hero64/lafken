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
