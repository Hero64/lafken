import { alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import { Fn } from 'cdktf';
import { Construct } from 'constructs';
import type { RuleProps } from './rule.types';

export class Rule extends Construct {
  constructor(
    scope: Construct,
    private id: string,
    private props: RuleProps
  ) {
    super(scope, `${id}-rule`);
  }

  public async create() {
    const { handler, resourceMetadata, bus } = this.props;

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
        name: `${this.id}-rule`,
        eventBusName: bus.name,
        eventPattern: Fn.jsonencode(this.getEvent()),
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
      inputPath: '$.detail',
    });
  }

  private getEvent(): Record<string, any> {
    const { handler } = this.props;

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
            keys: this.keyToMarshall(handler.pattern.detail?.keys),
          },
        };
      }

      default:
        throw new Error('Unsupported integration type');
    }
  }

  private keyToMarshall(values?: Record<string, number | string>) {
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
