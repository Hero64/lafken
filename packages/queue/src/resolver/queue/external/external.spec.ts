import { DataAwsSqsQueue } from '@cdktn/provider-aws/lib/data-aws-sqs-queue';
import { LambdaEventSourceMapping } from '@cdktn/provider-aws/lib/lambda-event-source-mapping';
import { SqsQueue } from '@cdktn/provider-aws/lib/sqs-queue';
import { SqsQueueRedrivePolicy } from '@cdktn/provider-aws/lib/sqs-queue-redrive-policy';
import { enableBuildEnvVariable } from '@lafken/common';
import { LambdaHandler, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Fifo, Queue, Standard } from '../../../main';
import { ExternalQueue } from './external';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('ExternalQueue', () => {
  enableBuildEnvVariable();

  @Queue()
  class TestQueue {
    @Standard()
    standard() {}

    @Fifo()
    fifo() {}
  }

  const baseMetadata = {
    filename: 'test.js',
    foldername: __dirname,
    name: 'queue',
    originalName: 'queue',
    type: 'QUEUE',
    minify: undefined,
  } as const;

  it('should reference existing standard queue as data source', () => {
    const { stack, module } = setupTestingStackWithModule();

    new ExternalQueue(module, 'standard', {
      handler: {
        name: 'standard',
        isFifo: false,
        queueName: 'my-existing-queue',
        isExternal: true,
      },
      resourceMetadata: baseMetadata,
      classResource: TestQueue,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsSqsQueue, {
      name: 'my-existing-queue',
    });

    expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
      function_name: 'test-function',
    });
  });

  it('should reference existing fifo queue with .fifo suffix', () => {
    const { stack, module } = setupTestingStackWithModule();

    new ExternalQueue(module, 'fifo', {
      handler: {
        name: 'fifo',
        isFifo: true,
        queueName: 'my-fifo-queue',
        isExternal: true,
      },
      resourceMetadata: baseMetadata,
      classResource: TestQueue,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveDataSourceWithProperties(DataAwsSqsQueue, {
      name: 'my-fifo-queue.fifo',
    });

    expect(synthesized).toHaveResourceWithProperties(LambdaEventSourceMapping, {
      function_response_types: ['ReportBatchItemFailures'],
    });
  });

  it('should not create SqsQueue or redrive policy resources', () => {
    const { stack, module } = setupTestingStackWithModule();

    new ExternalQueue(module, 'standard', {
      handler: {
        name: 'standard',
        isFifo: false,
        queueName: 'my-existing-queue',
        isExternal: true,
      },
      resourceMetadata: baseMetadata,
      classResource: TestQueue,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).not.toHaveResourceWithProperties(SqsQueue, {});
    expect(synthesized).not.toHaveResourceWithProperties(SqsQueueRedrivePolicy, {});
  });

  it('should pass correct handler props to LambdaHandler', () => {
    const { module } = setupTestingStackWithModule();

    new ExternalQueue(module, 'standard', {
      handler: {
        name: 'standard',
        isFifo: false,
        queueName: 'my-existing-queue',
        isExternal: true,
      },
      resourceMetadata: baseMetadata,
      classResource: TestQueue,
    });

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'standard-handler',
      expect.objectContaining({
        filename: 'test.js',
        isFifo: false,
        name: 'standard',
        foldername: __dirname,
        suffix: 'queue',
      })
    );
  });
});
