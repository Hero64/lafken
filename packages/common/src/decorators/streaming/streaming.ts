import { isBuildEnvironment } from '../../utils';
import './awslambda.types';

/**
 * Method decorator factory that marks a Lambda handler as a response-streaming
 * handler by wrapping it with `awslambda.streamifyResponse`.
 *
 * `awslambda` is a global injected by the AWS Lambda Node.js runtime only when
 * the function actually executes there; it does not exist during synth (the
 * plain Node process that reads decorator metadata to generate Terraform), so
 * the wrapping is skipped in that environment and only applied at real runtime.
 *
 * The decorated method's signature changes accordingly, from
 * `(event, context)` to `(event, responseStream, context)`.
 *
 * Must be the outermost decorator on the method (declared above any other
 * method decorator) so that the marker `awslambda.streamifyResponse` sets on
 * the returned function ends up on the final exported handler — AWS detects
 * streaming handlers by inspecting that exact function object. Declaring it
 * as the innermost decorator would let an outer decorator (e.g. one built
 * from `createLambdaDecorator`) replace `descriptor.value` afterwards,
 * discarding that marker.
 *
 * When combined with a method decorator built from `createLambdaDecorator`
 * (e.g. `Handler`), that decorator's generated wrapper detects the incoming
 * `responseStream` via `instanceof Stream` and forwards it to any parameter
 * decorated with `ResponseStreaming()`.
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
  () => () => (_target: any, _methodName: string, descriptor: PropertyDescriptor) => {
    if (isBuildEnvironment()) {
      return descriptor;
    }

    const originalValue = descriptor.value;
    descriptor.value = awslambda.streamifyResponse(originalValue);
    return descriptor;
  };

export const Streaming = createStreamingDecorator();
