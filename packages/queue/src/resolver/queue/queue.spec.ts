import 'cdktn/lib/testing/adapters/jest';
import { LambdaEventSourceMapping } from '@cdktn/provider-aws/lib/lambda-event-source-mapping';
import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { Event, Fifo, Param, Payload, Queue, Standard } from '../../main';
import { Queue as QueueResolver } from './queue';

Testing.setupJest();

jest.mock('@lafken/resolver', () => {
  const actual = jest.requireActual('@lafken/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
    })),
  };
});

describe('Queue', () => {
  enableBuildEnvVariable();
  @Payload()
  class ParamError {
    @Param({
      source: 'attribute',
    })
    attr: boolean;
  }

  @Payload()
  class BodyError {
    @Param({
      source: 'body',
    })
    body: string;

    @Param({
      source: 'body',
    })
    body2: string;
  }
  @Queue()
  class TestQueue {
    @Fifo()
    fifo() {}

    @Standard()
    standard() {}

    @Fifo()
    paramTypeError(@Event(ParamError) _e: ParamError) {}

    @Fifo()
    bodyError(@Event(BodyError) _e: BodyError) {}
  }

  it('should create a fifo queue integration without file creation', () => {
    const { stack, module } = setupTestingStackWithModule();

    new QueueResolver(module, 'fifo', {
      handler: {
        name: 'fifo',
        queueName: 'fifo',
        isFifo: true,
      },
      resourceMetadata: {
        filename: 'test.js',
        foldername: __dirname,
        name: 'queue',
        originalName: 'queue',
        type: 'QUEUE',
        minify: true,
      },
      classResource: TestQueue,
    });

    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'fifo-handler',
      expect.objectContaining({
        filename: 'test.js',
        isFifo: true,
        name: 'fifo',
        foldername: __dirname,
        suffix: 'queue',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
      fifo_queue: true,
      name: 'fifo.fifo',
    });

    expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
      event_source_arn: '${aws_sqs_queue.testing_fifo-queue_786F7E64.arn}',
      function_name: 'test-function',
    });
  });

  it('should create a standard queue integration without file creation', () => {
    const { stack, module } = setupTestingStackWithModule();
    new QueueResolver(module, 'standard', {
      handler: {
        name: 'standard',
        isFifo: false,
        queueName: 'standard',
      },
      resourceMetadata: {
        filename: 'test.js',
        foldername: __dirname,
        name: 'queue',
        originalName: 'queue',
        type: 'QUEUE',
        minify: true,
      },
      classResource: TestQueue,
    });

    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'fifo-handler',
      expect.objectContaining({
        filename: 'test.js',
        isFifo: true,
        name: 'fifo',
        foldername: __dirname,
        suffix: 'queue',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(SqsQueue, {
      fifo_queue: false,
      name: 'standard',
    });

    expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
      event_source_arn: '${aws_sqs_queue.testing_standard-queue_F7393BE3.arn}',
      function_name: 'test-function',
    });
  });

  it('should throw error with invalid attribute event param', () => {
    const { module } = setupTestingStackWithModule();
    expect(() => {
      new QueueResolver(module, 'standard', {
        handler: {
          name: 'paramTypeError',
          isFifo: false,
          queueName: 'standard',
        },
        resourceMetadata: {
          filename: 'test.js',
          foldername: __dirname,
          name: 'queue',
          originalName: 'queue',
          type: 'QUEUE',
          minify: true,
        },
        classResource: TestQueue,
      });
    }).toThrow();
  });

  it('should throw error with invalid body event', () => {
    const { module } = setupTestingStackWithModule();
    expect(() => {
      new QueueResolver(module, 'standard', {
        handler: {
          name: 'bodyError',
          isFifo: false,
          queueName: 'standard',
        },
        resourceMetadata: {
          filename: 'test.js',
          foldername: __dirname,
          name: 'queue',
          originalName: 'queue',
          type: 'QUEUE',
          minify: true,
        },
        classResource: TestQueue,
      });
    }).toThrow();
  });
});
