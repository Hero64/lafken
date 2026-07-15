import type { Writable } from 'node:stream';

export enum StreamingReflectKeys {
  streaming = 'streaming:handlers',
}

export type StreamingMethods = Record<string, boolean>;

declare global {
  /**
   * Global injected by the AWS Lambda Node.js runtime when the function uses
   * response streaming. It is not importable; it only exists inside the
   * Lambda execution environment (not during synth, local dev, or tests).
   */
  const awslambda: {
    streamifyResponse<E = any>(
      handler: (event: E, responseStream: Writable, context: any) => Promise<void> | void
    ): (event: E, responseStream: Writable, context: any) => Promise<void>;
    HttpResponseStream: {
      from(
        stream: Writable,
        metadata: {
          statusCode?: number;
          headers?: Record<string, string>;
          cookies?: string[];
        }
      ): Writable;
    };
  };
}
