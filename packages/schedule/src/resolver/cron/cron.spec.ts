import { CloudwatchEventRule } from '@cdktn/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktn/provider-aws/lib/cloudwatch-event-target';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import { LambdaHandler, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Cron, type EventCronMetadata, Schedule } from '../../main';
import { Cron as CronResolver } from './cron';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('Cron', () => {
  enableBuildEnvVariable();

  @Schedule()
  class TestEvent {
    @Cron({
      schedule: {
        day: 10,
        hour: 11,
      },
    })
    cron() {}
  }

  const metadata: ResourceMetadata = getResourceMetadata(TestEvent);
  const handlers = getResourceHandlerMetadata<EventCronMetadata>(TestEvent);

  it('should create an eventbridge schedule', async () => {
    const { stack, module } = setupTestingStackWithModule();

    new CronResolver(module, 'cron', {
      handler: handlers[0],
      resourceMetadata: metadata,
    });

    const synthesized = Testing.synth(stack);
    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'cron-TestEvent',
      expect.objectContaining({
        filename: metadata.filename,
        schedule: { day: 10, hour: 11 },
        name: 'cron',
        foldername: metadata.foldername,
        suffix: 'event',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
      name: 'cron',
      schedule_expression: 'cron(* 11 10 * ? *)',
    });

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
      arn: 'test-function',
      rule: '${aws_cloudwatch_event_rule.testing_cron-cron_3E870998.name}',
    });
  });
});
