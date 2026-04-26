import { CloudwatchEventRule } from '@cdktn/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktn/provider-aws/lib/cloudwatch-event-target';
import {
  type AppModule,
  LambdaHandler,
  lafkenResource,
  ResourceOutput,
} from '@lafken/resolver';
import type { ScheduleOutputAttributes, ScheduleTime } from '../../main';
import type { CronProps } from './cron.types';

export class Cron extends lafkenResource.make(CloudwatchEventRule) {
  constructor(
    scope: AppModule,
    id: string,
    private props: CronProps
  ) {
    const { handler } = props;
    super(scope, `${handler.name}-cron`, {
      name: handler.name,
      scheduleExpression: Cron.buildScheduleExpression(handler.schedule),
    });

    if (props.handler.ref) {
      this.register('schedule', props.handler.ref);
    }

    this.addEventTarget(id);

    new ResourceOutput<ScheduleOutputAttributes>(this, handler.outputs);
  }

  public addEventTarget(id: string) {
    const { handler, resourceMetadata } = this.props;

    const lambdaHandler = new LambdaHandler(
      this,
      `${handler.name}-${resourceMetadata.name}`,
      {
        ...handler,
        originalName: resourceMetadata.originalName,
        filename: resourceMetadata.filename,
        foldername: resourceMetadata.foldername,
        suffix: 'event',
        principal: 'events.amazonaws.com',
        sourceArn: this.arn,
      }
    );

    new CloudwatchEventTarget(this, `${id}-event-target`, {
      rule: this.name,
      arn: lambdaHandler.arn,
      retryPolicy: {
        maximumRetryAttempts: handler.retryAttempts,
        maximumEventAgeInSeconds: handler.maxEventAge,
      },
      dependsOn: [lambdaHandler],
    });
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
