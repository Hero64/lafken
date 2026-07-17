import { afterEach, describe, expect, it } from 'vitest';
import { LAFKEN_CONTEXT } from '../../constants/env.constants';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '../../utils';
import { createStreamingDecorator, Streaming } from './streaming';
import { type StreamingMethods, StreamingReflectKeys } from './streaming.types';

describe('Streaming decorator', () => {
  afterEach(() => {
    delete process.env[LAFKEN_CONTEXT];
  });

  it('leaves the method implementation untouched (no runtime wrapping)', () => {
    class Test {
      @Streaming()
      handler() {
        return 'original';
      }
    }

    expect(typeof Test.prototype.handler).toBe('function');
    expect(Test.prototype.handler()).toBe('original');
  });

  it('createStreamingDecorator returns a usable decorator factory', () => {
    const CustomStreaming = createStreamingDecorator();

    class Test {
      @CustomStreaming()
      handler() {
        return 'ok';
      }
    }

    expect(Test.prototype.handler()).toBe('ok');
  });

  it('records the handler as streaming in reflect-metadata during synth/build', () => {
    enableBuildEnvVariable();

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

  it('does not record metadata outside build/synth', () => {
    class Test {
      @Streaming()
      handler() {}
    }

    const streamingMethods = getMetadataPrototypeByKey<StreamingMethods>(
      Test,
      StreamingReflectKeys.streaming
    );

    expect(streamingMethods).toBeUndefined();
  });
});
