import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';
import {
  type HandlerMetadata,
  type HandlerProps,
  RESOURCE_TYPE,
} from './standalone.types';

/**
 * Class decorator that marks a class as a standalone Lambda resource module.
 * The resolver uses the metadata stored by this decorator to discover and wire
 * up all `@Handler`-decorated methods within the class.
 *
 * @example
 * @Standalone()
 * export class MyFunctions {
 *   @Handler()
 *   myHandler() {}
 * }
 */
export const Standalone = createResourceDecorator({
  type: RESOURCE_TYPE,
});

/**
 * Method decorator that registers a class method as a Lambda handler.
 * The decorated method becomes the entry point of a Lambda function; its name
 * (or the explicit `name` prop) is used as the logical function identifier.
 *
 * @example
 * // Minimal — uses the method name as the handler name
 * @Handler()
 * myHandler() {}
 *
 * @example
 * // Custom name + invoke role for API Gateway
 * @Handler({
 *   name: 'my-handler',
 *   invocator: {
 *     principal: 'apigateway.amazonaws.com',
 *     services: (props) => [{ type: 'execute-api', permissions: ['Invoke'], resources: [props.arn] }],
 *     roleRef: 'myHandlerInvokeRole',
 *   },
 *   ref: 'myHandler',
 * })
 * myHandler() {}
 */
export const Handler = createLambdaDecorator<HandlerProps, HandlerMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    name: props.name || methodName,
  }),
});
