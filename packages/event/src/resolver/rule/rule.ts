import { type AppModule, alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import { Fn } from 'cdktf';
import type { EventRuleMetadata } from '../../main';
import type { RuleProps } from './rule.types';

export class Rule extends alicantoResource.make(CloudwatchEventRule) {
  constructor(
    scope: AppModule,
    id: string,
    private props: RuleProps
  ) {
    const { handler, bus } = props;

    super(scope, `${id}-rule`, {
      name: id,
      eventBusName: bus.name,
      eventPattern: Fn.jsonencode(Rule.getEvent(handler)),
    });

    this.isGlobal(scope.id, id);
    this.addEventTarget(id);
  }

  private addEventTarget(id: string) {
    const { resourceMetadata, handler } = this.props;
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
      inputPath: '$.detail',
    });
  }

  private static getEvent(handler: EventRuleMetadata): Record<string, any> {
    if (!handler.integration) {
      return {
        source: [handler.pattern.source],
        detail: handler.pattern.detail,
        'detail-type': handler.pattern.detailType,
      };
    }

    switch (handler.integration) {
      case 's3': {
        return {
          source: ['aws.s3'],
          'detail-type': handler.pattern.detailType,
          detail: handler.pattern.detail,
        };
      }

      case 'dynamodb': {
        return {
          source: [`dynamodb.${handler.pattern.source}`],
          'detail-type': ['db:stream'],
          detail: {
            eventName: handler.pattern.detail?.eventName,
            keys: Rule.keyToMarshall(handler.pattern.detail?.keys),
          },
        };
      }

      default:
        throw new Error('Unsupported integration type');
    }
  }

  private static keyToMarshall(values?: Record<string, number | string>) {
    if (!values) return undefined;

    return Object.entries(values).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          [typeof value === 'number' ? 'N' : 'S']: value.toString(),
        };
        return acc;
      },
      {} as Record<string, any>
    );
  }
}
