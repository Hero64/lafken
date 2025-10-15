import { alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import { Construct } from 'constructs';
import type { ScheduleTime } from '../../main';
import type { CronProps } from './cron.types';

export class Cron extends Construct {
  constructor(
    scope: Construct,
    private id: string,
    private props: CronProps
  ) {
    super(scope, `${id}-rule`);
  }

  public async create() {
    const { handler, resourceMetadata } = this.props;

    const lambdaHandler = new LambdaHandler(this, 'handler', {
      ...handler,
      filename: resourceMetadata.filename,
      pathName: resourceMetadata.foldername,
      suffix: 'event',
      principal: 'events.amazonaws.com',
    });

    const lambda = await lambdaHandler.generate();

    const rule = alicantoResource.create(
      resourceMetadata.name,
      CloudwatchEventRule,
      this,
      `${this.id}-rule`,
      {
        name: `${handler.name}-cron`,
        scheduleExpression: this.buildScheduleExpression(handler.schedule),
      }
    );

    rule.isGlobal();

    new CloudwatchEventTarget(this, `${this.id}-event-target`, {
      rule: rule.name,
      arn: lambda.arn,
      retryPolicy: {
        maximumRetryAttempts: handler.retryAttempts,
        maximumEventAgeInSeconds: handler.maxEventAge,
      },
    });
  }

  private buildScheduleExpression(schedule: string | ScheduleTime): string {
    if (typeof schedule === 'string') {
      return `cron(${schedule})`;
    }

    const { minute, hour, day, month, year, weekDay } = schedule;

    return `cron(${minute ?? '*'} ${hour ?? '*'} ${day ?? '?'} ${month ?? '*'} ${weekDay ?? '*'} ${year ?? '*'})`;
  }
}
