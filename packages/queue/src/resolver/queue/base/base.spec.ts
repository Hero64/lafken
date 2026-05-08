import { enableBuildEnvVariable } from '@lafken/common';
import { setupTestingStackWithModule } from '@lafken/resolver';
import { describe, expect, it, vi } from 'vitest';
import { Event, Fifo, Param, Payload, Queue } from '../../../main';
import { ExternalQueue } from '../external/external';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('QueueBase', () => {
  enableBuildEnvVariable();

  @Payload()
  class InvalidAttributeType {
    @Param({ source: 'attribute' })
    attr: boolean;
  }

  @Payload()
  class MultipleBodyParams {
    @Param({ source: 'body' })
    first: string;

    @Param({ source: 'body' })
    second: string;
  }

  @Queue()
  class TestQueue {
    @Fifo()
    invalidAttribute(@Event(InvalidAttributeType) _e: InvalidAttributeType) {}

    @Fifo()
    multipleBody(@Event(MultipleBodyParams) _e: MultipleBodyParams) {}
  }

  const baseMetadata = {
    filename: 'test.js',
    foldername: __dirname,
    name: 'queue',
    originalName: 'queue',
    type: 'QUEUE',
    minify: undefined,
  } as const;

  it('should throw when attribute param has unsupported type', () => {
    const { module } = setupTestingStackWithModule();

    expect(() => {
      new ExternalQueue(module, 'test', {
        handler: { name: 'invalidAttribute', isFifo: true, queueName: 'test-queue' },
        resourceMetadata: baseMetadata,
        classResource: TestQueue,
      });
    }).toThrow('Attribute params only support String, Number values');
  });

  it('should throw when more than one body param is declared', () => {
    const { module } = setupTestingStackWithModule();

    expect(() => {
      new ExternalQueue(module, 'test', {
        handler: { name: 'multipleBody', isFifo: true, queueName: 'test-queue' },
        resourceMetadata: baseMetadata,
        classResource: TestQueue,
      });
    }).toThrow('Queue event only support one body param');
  });
});
