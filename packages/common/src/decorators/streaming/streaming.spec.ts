import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAFKEN_CONTEXT } from '../../constants/env.constants';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '../../utils';
import { createStreamingDecorator, Streaming } from './streaming';
import { type StreamingMethods, StreamingReflectKeys } from './streaming.types';

describe('Streaming decorator', () => {
  const streamifyResponse = vi.fn((handler) => handler);

  beforeEach(() => {
    streamifyResponse.mockClear();
    (globalThis as any).awslambda = { streamifyResponse };
  });

  afterEach(() => {
    delete process.env[LAFKEN_CONTEXT];
  });

  it('wraps the method with awslambda.streamifyResponse', () => {
    class Test {
      @Streaming()
      handler(_event: any, _responseStream: any, _context: any) {}
    }

    const originalValue = Test.prototype.handler;
    expect(streamifyResponse).toHaveBeenCalledWith(originalValue);
  });

  it('preserves the wrapped function as the descriptor value', () => {
    const wrapped = () => 'wrapped';
    streamifyResponse.mockReturnValueOnce(wrapped);

    class Test {
      @Streaming()
      handler() {}
    }

    expect(Test.prototype.handler).toBe(wrapped);
  });

  it('createStreamingDecorator returns a usable decorator factory', () => {
    const CustomStreaming = createStreamingDecorator();

    class Test {
      @CustomStreaming()
      handler() {}
    }

    expect(streamifyResponse).toHaveBeenCalled();
    expect(typeof Test.prototype.handler).toBe('function');
  });

  it('skips wrapping during synth/build, where the awslambda global does not exist', () => {
    enableBuildEnvVariable();
    delete (globalThis as any).awslambda;

    class Test {
      @Streaming()
      handler() {
        return 'original';
      }
    }

    expect(streamifyResponse).not.toHaveBeenCalled();
    expect(Test.prototype.handler()).toBe('original');
  });

  it('records the handler as streaming in reflect-metadata during synth/build', () => {
    enableBuildEnvVariable();
    delete (globalThis as any).awslambda;

    class Test {
      @Streaming()
      streamingHandler() {}

      plainHandler() {}
    }

    const streamingMethods = getMetadataPrototypeByKey<StreamingMethods>(
      Test,
      StreamingReflectKeys.streaming
    );

    expect(streamingMethods).toEqual({ streamingHandler: true });
    expect(streamingMethods.plainHandler).toBeUndefined();
  });

  it('accumulates metadata across multiple streaming handlers on the same class', () => {
    enableBuildEnvVariable();
    delete (globalThis as any).awslambda;

    class Test {
      @Streaming()
      first() {}

      @Streaming()
      second() {}
    }

    const streamingMethods = getMetadataPrototypeByKey<StreamingMethods>(
      Test,
      StreamingReflectKeys.streaming
    );

    expect(streamingMethods).toEqual({ first: true, second: true });
  });
});
