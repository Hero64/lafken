import { type AppModule, alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import type { ScheduleTime } from '../../main';
import type { CronProps } from './cron.types';

export class Cron extends alicantoResource.make(CloudwatchEventRule) {
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

    this.isGlobal(scope.id);
    this.addEventTarget(id);
  }

  public addEventTarget(id: string) {
    const { handler, resourceMetadata } = this.props;

    const lambdaHandler = new LambdaHandler(this, 'handler', {
      ...handler,
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      suffix: 'event',
      principal: 'events.amazonaws.com',
    });

    new CloudwatchEventTarget(this, `${id}-event-target`, {
      rule: this.name,
      arn: lambdaHandler.arn,
      retryPolicy: {
        maximumRetryAttempts: handler.retryAttempts,
        maximumEventAgeInSeconds: handler.maxEventAge,
      },
    });
  }

  private static buildScheduleExpression(schedule: string | ScheduleTime): string {
    if (typeof schedule === 'string') {
      return `cron(${schedule})`;
    }

    const { minute, hour, day, month, year, weekDay } = schedule;

    return `cron(${minute ?? '*'} ${hour ?? '*'} ${day ?? '?'} ${month ?? '*'} ${weekDay ?? '*'} ${year ?? '*'})`;
  }
}
