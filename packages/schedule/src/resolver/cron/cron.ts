import { SchedulerSchedule } from '@cdktn/provider-aws/lib/scheduler-schedule';
import {
  type AppModule,
  LambdaHandler,
  lafkenResource,
  ResourceOutput,
  Role,
} from '@lafken/resolver';
import type { ScheduleOutputAttributes, ScheduleTime } from '../../main';
import type { CronProps } from './cron.types';

export class Cron extends lafkenResource.make(SchedulerSchedule) {
  constructor(scope: AppModule, id: string, props: CronProps) {
    const { handler, resourceMetadata } = props;

    const lambdaHandler = new LambdaHandler(scope, id, {
      ...handler,
      originalName: resourceMetadata.originalName,
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      suffix: 'event',
      principal: 'scheduler.amazonaws.com',
    });

    const schedulerRole = new Role(scope, `${handler.name}-scheduler-role`, {
      name: `${handler.name}-scheduler`,
      principal: 'scheduler.amazonaws.com',
      services: ['lambda'],
    });

    super(scope, `${handler.name}-cron`, {
      name: handler.name,
      scheduleExpression: Cron.buildScheduleExpression(handler.schedule),
      scheduleExpressionTimezone: handler.timezone,
      description: handler.description,
      state: handler.state?.toUpperCase(),
      startDate: handler.startDate,
      endDate: handler.endDate,
      flexibleTimeWindow: handler.flexibleWindowMinutes
        ? {
            mode: 'FLEXIBLE',
            maximumWindowInMinutes: handler.flexibleWindowMinutes,
          }
        : { mode: 'OFF' },
      target: {
        arn: lambdaHandler.arn,
        roleArn: schedulerRole.arn,
        retryPolicy: {
          maximumRetryAttempts: handler.retryAttempts,
          maximumEventAgeInSeconds: handler.maxEventAge,
        },
      },
    });

    if (handler.ref) {
      this.register('schedule', handler.ref);
    }

    new ResourceOutput<ScheduleOutputAttributes>(this, handler.outputs);
  }

  private static buildScheduleExpression(schedule: string | ScheduleTime): string {
    if (typeof schedule === 'string') {
      return `cron(${schedule})`;
    }

    const {
      minute = '*',
      hour = '*',
      day = '*',
      month = '*',
      year = '*',
      weekDay = '*',
    } = schedule;

    let dayValue: string;
    let weekDayValue: string;

    if (day && day !== '*' && day !== '?') {
      dayValue = day.toString();
      weekDayValue = '?';
    } else if (weekDay && weekDay !== '*' && weekDay !== '?') {
      dayValue = '?';
      weekDayValue = weekDay.toString();
    } else {
      dayValue = day?.toString() ?? '*';
      weekDayValue = '?';
    }

    return `cron(${minute} ${hour} ${dayValue} ${month} ${weekDayValue} ${year})`;
  }
}
