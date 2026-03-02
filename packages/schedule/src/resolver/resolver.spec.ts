import { CloudwatchEventRule } from '@cdktn/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktn/provider-aws/lib/cloudwatch-event-target';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  LambdaHandler,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Cron, Schedule } from '../main';
import { ScheduleResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('schedule resolver', () => {
  enableBuildEnvVariable();

  describe('create', () => {
    it('should create a cron schedule with string expression', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: '0 12 * * ? *' })
        dailyJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'dailyJob',
        schedule_expression: 'cron(0 12 * * ? *)',
      });
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
        arn: 'test-function',
      });
    });

    it('should create a cron schedule with object expression', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: { hour: 8, minute: 30 } })
        morningJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'morningJob',
        schedule_expression: 'cron(30 8 * * ? *)',
      });
    });

    it('should create a cron schedule with day of month', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: { day: 1, hour: 0, minute: 0 } })
        monthlyJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'monthlyJob',
        schedule_expression: 'cron(0 0 1 * ? *)',
      });
    });

    it('should create a cron schedule with weekDay', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: { weekDay: 'MON', hour: 9, minute: 0 } })
        weeklyJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'weeklyJob',
        schedule_expression: 'cron(0 9 ? * MON *)',
      });
    });

    it('should create multiple cron schedules from one resource', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: '0 8 * * ? *' })
        jobA() {}

        @Cron({ schedule: '0 20 * * ? *' })
        jobB() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'jobA',
        schedule_expression: 'cron(0 8 * * ? *)',
      });
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'jobB',
        schedule_expression: 'cron(0 20 * * ? *)',
      });
    });

    it('should create a cron schedule with retry policy', () => {
      @Schedule()
      class TestSchedule {
        @Cron({
          schedule: '0 12 * * ? *',
          retryAttempts: 3,
          maxEventAge: 7200,
        })
        retryJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
        arn: 'test-function',
        retry_policy: {
          maximum_retry_attempts: 3,
          maximum_event_age_in_seconds: 7200,
        },
      });
    });

    it('should create a cron schedule with full object expression', () => {
      @Schedule()
      class TestSchedule {
        @Cron({
          schedule: {
            minute: 0,
            hour: 6,
            day: 15,
            month: 3,
            year: 2026,
          },
        })
        specificJob() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'specificJob',
        schedule_expression: 'cron(0 6 15 3 ? 2026)',
      });
    });

    it('should call LambdaHandler with correct config', () => {
      @Schedule()
      class TestSchedule {
        @Cron({ schedule: '0 0 * * ? *' })
        handler() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new ScheduleResolver();

      resolver.create(module as unknown as AppModule, TestSchedule);

      Testing.synth(stack);

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'handler-TestSchedule',
        expect.objectContaining({
          name: 'handler',
          schedule: '0 0 * * ? *',
          suffix: 'event',
          principal: 'events.amazonaws.com',
        })
      );
    });
  });
});
