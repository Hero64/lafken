import { type AppModule, alicantoResource, LambdaHandler } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import { Fn } from 'cdktf';
import type {
  DynamoAttributeFilters,
  EventBridgePattern,
  EventRuleMetadata,
} from '../../main';
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
      }
    );

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
        const dynamoDetail = {
          ...(handler.pattern.detail?.keys
            ? {
                Keys: Rule.transformAttributes(handler.pattern.detail?.keys),
              }
            : {}),
          ...(handler.pattern.detail?.newImage
            ? {
                NewImage: Rule.transformAttributes(handler.pattern.detail?.newImage),
              }
            : {}),
          ...(handler.pattern.detail?.oldImage
            ? {
                OldImage: Rule.transformAttributes(handler.pattern.detail?.oldImage),
              }
            : {}),
        };

        return {
          source: [`dynamodb.${handler.pattern.source}`],
          'detail-type': ['db:stream'],
          ...(Object.keys(dynamoDetail).length > 0 || handler.pattern.detail?.eventName
            ? {
                detail: {
                  ...(handler.pattern.detail?.eventName
                    ? {
                        eventName: handler.pattern.detail?.eventName,
                      }
                    : {}),
                  dynamodb: dynamoDetail,
                },
              }
            : {}),
        };
      }

      default:
        throw new Error('Unsupported integration type');
    }
  }

  private static inferDynamoDBType(value: EventBridgePattern): string {
    if (typeof value === 'string') return 'S';
    if (typeof value === 'number') return 'N';
    if (typeof value === 'boolean') return 'BOOL';
    if (typeof value === 'object') {
      if ('numeric' in value) return 'N';
      if ('prefix' in value || 'suffix' in value || 'equals-ignore-case' in value)
        return 'S';
    }
    return 'S';
  }

  private static transformAttributes(attrs: DynamoAttributeFilters | undefined) {
    if (!attrs) return undefined;

    const transformed: any = {};

    for (const [key, value] of Object.entries(attrs)) {
      const values = Array.isArray(value) ? value : [value];
      const type = Rule.inferDynamoDBType(values[0]);

      transformed[key] = {
        [type]: values,
      };
    }

    return transformed;
  }
}
