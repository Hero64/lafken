import type { FieldTypes } from '@alicanto/common';
import { alicantoResource, Role } from '@alicanto/resolver';
import { marshall } from '@aws-sdk/util-dynamodb';
import { CloudwatchEventBus } from '@cdktf/provider-aws/lib/cloudwatch-event-bus';
import {
  DynamodbTable,
  type DynamodbTableAttribute,
} from '@cdktf/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktf/provider-aws/lib/pipes-pipe';
import { Construct } from 'constructs';
import type { DynamoIndex, DynamoStream, FieldsMetadata } from '../../main';
import { getModelInformation } from '../../service';
import type { TableProps } from './table.types';

const mapFieldType: Partial<Record<FieldTypes, string>> = {
  String: 'S',
  Number: 'N',
  Boolean: 'BOOL',
};

export class Table extends Construct {
  constructor(scope: Construct, props: TableProps) {
    const {
      modelProps,
      partitionKey: partitionKeyName,
      sortKey: sortKeyName,
      fields,
    } = getModelInformation(props.classResource);

    super(scope, `${modelProps.name}-table`);

    const table = alicantoResource.create(
      'dynamo',
      DynamodbTable,
      this,
      modelProps.name,
      {
        name: modelProps.name,
        rangeKey: sortKeyName,
        hashKey: partitionKeyName,
        attribute: this.getAttributes(fields),
        globalSecondaryIndex: this.getSecondaryIndexes(modelProps.indexes),
        streamEnabled: !!modelProps.stream?.enabled,
        streamViewType: modelProps.stream?.enabled
          ? modelProps.stream?.type || 'NEW_AND_OLD_IMAGES'
          : undefined,
        ttl: modelProps.ttl
          ? {
              attributeName: modelProps.ttl.toString(),
              enabled: true,
            }
          : undefined,
      }
    );

    table.isGlobal();

    if (modelProps.stream?.enabled) {
      const defaultBus = new CloudwatchEventBus(scope, 'DefaultBus', {
        name: 'default',
      });

      const role = new Role(scope, `pipe-dynamo-${modelProps.name}-role`, {
        services: [
          {
            type: 'dynamodb',
            permissions: [
              'DescribeStream',
              'GetRecords',
              'GetShardIterator',
              'ListStreams',
            ],
            resources: [table.arn],
          },
          {
            type: 'event',
            permissions: ['PutEvents'],
            resources: [defaultBus.arn],
          },
        ],
        name: `pipe-dynamo-${modelProps.name}-role`,
        principal: 'pipes.amazonaws.com',
      });

      const filters = this.createFilterCriteria(modelProps.stream);

      new PipesPipe(scope, `${modelProps.name}-pipe`, {
        name: `${modelProps.name}-pipe`,
        roleArn: role.arn,
        source: table.streamArn,
        target: defaultBus.arn,
        desiredState: 'RUNNING',
        sourceParameters: {
          dynamodbStreamParameters: {
            startingPosition: 'LATEST',
            batchSize: modelProps.stream.batchSize || 10,
            maximumBatchingWindowInSeconds:
              modelProps.stream.maximumBatchingWindowInSeconds || 1,
          },
          filterCriteria: filters.length
            ? { filter: filters.map((f) => ({ pattern: f.pattern })) }
            : undefined,
        },
        targetParameters: {
          eventbridgeEventBusParameters: {
            detailType: 'db:stream',
            source: `dynamodb.${modelProps.name}`,
          },
          inputTemplate: '<aws.pipes.event.json>',
        },
      });
    }
  }

  private getAttributes(fields: FieldsMetadata) {
    const attributes: DynamodbTableAttribute[] = [];

    for (const key in fields) {
      const field = fields[key];
      const parsedType = mapFieldType[field.type];
      if (!parsedType) {
        continue;
      }

      attributes.push({
        name: field.name,
        type: parsedType,
      });
    }

    return attributes;
  }

  private getSecondaryIndexes(indexes: DynamoIndex<any>[] = []) {
    return indexes.map((index) => ({
      hashKey: index.partitionKey.toString(),
      rangeKey: index.sortKey ? index.sortKey.toString() : undefined,
      name: index.name,
      projectionType: 'ALL',
    }));
  }

  private createFilterCriteria(stream: DynamoStream<any>) {
    const filters: { pattern: string }[] = [];
    if (!stream.filters) return [];

    if (stream.filters.eventName) {
      filters.push({ pattern: JSON.stringify({ eventName: stream.filters.eventName }) });
    }

    if (stream.filters.keys) {
      filters.push({
        pattern: JSON.stringify({ dynamodb: { Keys: marshall(stream.filters.keys) } }),
      });
    }

    if (stream.filters.newImage) {
      filters.push({
        pattern: JSON.stringify({
          dynamodb: {
            NewImage: {
              ...(stream.filters.newImage.keys
                ? marshall(stream.filters.newImage.keys)
                : {}),
              ...(stream.filters.newImage.attributes
                ? marshall(stream.filters.newImage.attributes)
                : {}),
            },
          },
        }),
      });
    }

    if (stream.filters.oldImage) {
      filters.push({
        pattern: JSON.stringify({
          dynamodb: {
            OldImage: {
              ...(stream.filters.oldImage.keys
                ? marshall(stream.filters.oldImage.keys)
                : {}),
              ...(stream.filters.oldImage.attributes
                ? marshall(stream.filters.oldImage.attributes)
                : {}),
            },
          },
        }),
      });
    }

    return filters;
  }
}
