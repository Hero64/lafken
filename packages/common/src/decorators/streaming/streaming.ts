import 'reflect-metadata';
import { isBuildEnvironment } from '../../utils';
import { type StreamingMethods, StreamingReflectKeys } from './streaming.types';

/**
 * Method decorator factory that marks a Lambda handler as a response-streaming
 * handler.
 *
 * It only records, per method name, that the handler is a streaming one under
 * `StreamingReflectKeys.streaming` on the class prototype (during synth). The
 * actual `awslambda.streamifyResponse` wrapping is applied later by the build
 * step, when the handler is exported as the Lambda entry point, so the
 * streaming marker ends up on the final exported function (a decorator wrap
 * would be dropped by `Function.prototype.bind` when the handler is bound to
 * its instance at export time).
 *
 * The decorated method's runtime signature is `(event, responseStream, context)`
 * instead of the usual `(event, context)`. When combined with a method decorator
 * built from `createLambdaDecorator` (e.g. `Get`/`Handler`), that decorator's
 * generated wrapper tells both signatures apart by checking whether the second
 * argument exposes a `write` function: if it does it is treated as the response
 * stream and forwarded to any parameter decorated with `ResponseStreaming()`,
 * and `context` is read from the third argument; otherwise the second argument
 * is the `context`. The check is structural rather than `instanceof Stream`
 * because the runtime hands over its own stream implementation, which does not
 * necessarily inherit from the `stream` module of this bundle.
 *
 * @example
 * @Streaming()
 * @Handler()
 * myHandler(@ResponseStreaming() responseStream: Writable, @Context() context: any) {
 *   responseStream.write('chunk');
 *   responseStream.end();
 * }
 */
export const createStreamingDecorator =
  () => () => (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    if (isBuildEnvironment()) {
      const streamingMethods: StreamingMethods =
        Reflect.getMetadata(StreamingReflectKeys.streaming, target) || {};

      Reflect.defineMetadata(
        StreamingReflectKeys.streaming,
        { ...streamingMethods, [methodName]: true },
        target
      );
    }

    return descriptor;
  };

export const Streaming = createStreamingDecorator();
