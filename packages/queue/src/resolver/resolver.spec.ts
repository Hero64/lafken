import { LambdaEventSourceMapping } from '@cdktn/provider-aws/lib/lambda-event-source-mapping';
import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  LambdaHandler,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Fifo, Queue, Standard } from '../main';
import { QueueResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('queue resolver', () => {
  enableBuildEnvVariable();

  describe('create', () => {
    it('should create a fifo queue', () => {
      @Queue()
      class TestQueue {
        @Fifo()
        myFifo() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: true,
        name: 'myFifo.fifo',
      });
      expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
        function_name: 'test-function',
      });
    });

    it('should create a standard queue', () => {
      @Queue()
      class TestQueue {
        @Standard()
        myStandard() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: false,
        name: 'myStandard',
      });
      expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
        function_name: 'test-function',
      });
    });

    it('should create multiple queues from one resource', () => {
      @Queue()
      class TestQueue {
        @Fifo()
        queueA() {}

        @Standard()
        queueB() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: true,
        name: 'queueA.fifo',
      });
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: false,
        name: 'queueB',
      });
    });

    it('should create a fifo queue with custom name', () => {
      @Queue()
      class TestQueue {
        @Fifo({ queueName: 'custom-fifo' })
        myFifo() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: true,
        name: 'custom-fifo.fifo',
      });
    });

    it('should create a fifo queue with content based deduplication', () => {
      @Queue()
      class TestQueue {
        @Fifo({ contentBasedDeduplication: true })
        myFifo() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        fifo_queue: true,
        name: 'myFifo.fifo',
        content_based_deduplication: true,
      });
    });

    it('should create a standard queue with configuration options', () => {
      @Queue()
      class TestQueue {
        @Standard({
          visibilityTimeout: 60,
          retentionPeriod: 86400,
          maxMessageSizeBytes: 1024,
          deliveryDelay: 10,
        })
        myStandard() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
        name: 'myStandard',
        visibility_timeout_seconds: 60,
        message_retention_seconds: 86400,
        max_message_size: 1024,
        delay_seconds: 10,
      });
    });

    it('should create a queue with batch size', () => {
      @Queue()
      class TestQueue {
        @Standard({ batchSize: 5 })
        myStandard() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
        batch_size: 5,
        function_name: 'test-function',
      });
    });

    it('should create a queue with max concurrency', () => {
      @Queue()
      class TestQueue {
        @Standard({ maxConcurrency: 10 })
        myStandard() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
        function_name: 'test-function',
        scaling_config: {
          maximum_concurrency: 10,
        },
      });
    });

    it('should create a fifo queue with ReportBatchItemFailures', () => {
      @Queue()
      class TestQueue {
        @Fifo()
        myFifo() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
        function_name: 'test-function',
        function_response_types: ['ReportBatchItemFailures'],
      });
    });

    it('should call LambdaHandler with correct config', () => {
      @Queue()
      class TestQueue {
        @Fifo()
        handler() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new QueueResolver();

      resolver.create(module as unknown as AppModule, TestQueue);

      Testing.synth(stack);

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'TestQueue-handler-handler',
        expect.objectContaining({
          name: 'handler',
          isFifo: true,
          suffix: 'queue',
          principal: 'sqs.amazonaws.com',
        })
      );
    });
  });
});
