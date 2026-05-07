import { SchedulerSchedule } from '@cdktn/provider-aws/lib/scheduler-schedule';
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

  it('should create an eventbridge scheduler schedule', async () => {
    const { stack, module } = setupTestingStackWithModule();

    new CronResolver(module, 'cron-TestEvent', {
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
        principal: 'scheduler.amazonaws.com',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(SchedulerSchedule, {
      name: 'cron',
      schedule_expression: 'cron(* 11 10 * ? *)',
      flexible_time_window: { mode: 'OFF' },
      target: expect.objectContaining({
        arn: 'test-function',
      }),
    });
  });
});
