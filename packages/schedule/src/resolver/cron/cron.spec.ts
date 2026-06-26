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

  it('should map optional attributes to the schedule resource', async () => {
    @Schedule()
    class OptionsEvent {
      @Cron({
        schedule: { hour: 8, minute: 0 },
        timezone: 'America/Santiago',
        description: 'Daily report',
        state: 'disabled',
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
      })
      cron() {}
    }

    const optionsMetadata = getResourceMetadata(OptionsEvent);
    const optionsHandlers = getResourceHandlerMetadata<EventCronMetadata>(OptionsEvent);
    const { stack, module } = setupTestingStackWithModule();

    new CronResolver(module, 'cron-OptionsEvent', {
      handler: optionsHandlers[0],
      resourceMetadata: optionsMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SchedulerSchedule, {
      schedule_expression_timezone: 'America/Santiago',
      description: 'Daily report',
      state: 'DISABLED',
      start_date: '2026-07-01T00:00:00Z',
      end_date: '2026-12-31T23:59:59Z',
    });
  });

  it('should enable a flexible time window when minutes are provided', async () => {
    @Schedule()
    class FlexibleEvent {
      @Cron({
        schedule: { hour: 8, minute: 0 },
        flexibleWindowMinutes: 15,
      })
      cron() {}
    }

    const flexibleMetadata = getResourceMetadata(FlexibleEvent);
    const flexibleHandlers = getResourceHandlerMetadata<EventCronMetadata>(FlexibleEvent);
    const { stack, module } = setupTestingStackWithModule();

    new CronResolver(module, 'cron-FlexibleEvent', {
      handler: flexibleHandlers[0],
      resourceMetadata: flexibleMetadata,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SchedulerSchedule, {
      flexible_time_window: { mode: 'FLEXIBLE', maximum_window_in_minutes: 15 },
    });
  });
});
