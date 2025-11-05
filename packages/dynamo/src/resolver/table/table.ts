import type { FieldTypes } from '@alicanto/common';
import { alicantoResource, Role } from '@alicanto/resolver';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DataAwsCloudwatchEventBus } from '@cdktf/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  DynamodbTable,
  type DynamodbTableAttribute,
  type DynamodbTableGlobalSecondaryIndex,
  type DynamodbTableLocalSecondaryIndex,
} from '@cdktf/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktf/provider-aws/lib/pipes-pipe';
import type { Construct } from 'constructs';
import type { DynamoIndex, DynamoStream, FieldsMetadata } from '../../main';
import { getModelInformation } from '../../service';
import type { TableProps } from './table.types';

const mapFieldType: Partial<Record<FieldTypes, string>> = {
  String: 'S',
  Number: 'N',
  Boolean: 'BOOL',
};

export class Table extends alicantoResource.make(DynamodbTable) {
  constructor(scope: Construct, props: TableProps) {
    const {
      modelProps,
      partitionKey: partitionKeyName,
      sortKey: sortKeyName,
      fields,
    } = getModelInformation(props.classResource);

    const { globalIndexes, localIndexes } = Table.getIndexes(modelProps.indexes);

    super(scope, `${modelProps.name}-table`, {
      name: modelProps.name,
      rangeKey: sortKeyName,
      hashKey: partitionKeyName,
      attribute: Table.getAttributes(fields),
      globalSecondaryIndex: globalIndexes,
      localSecondaryIndex: localIndexes,
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
    });

    this.isGlobal('dynamo');

    if (modelProps.stream?.enabled) {
      const defaultBus = new DataAwsCloudwatchEventBus(scope, 'DefaultBus', {
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
            resources: [this.arn],
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
        source: this.streamArn,
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

  private static getAttributes(fields: FieldsMetadata) {
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

  private static getIndexes(indexes: DynamoIndex<any>[] = []) {
    if (indexes.length === 0) {
      return {};
    }
    const globalIndexes: DynamodbTableGlobalSecondaryIndex[] = [];
    const localIndexes: DynamodbTableLocalSecondaryIndex[] = [];

    for (const index of indexes) {
      const projectionType = 'ALL';
      let nonKeyAttributes: string[] | undefined;
      if (Array.isArray(index.projection)) {
        nonKeyAttributes = index.projection as string[];
      }

      if (index.type === 'local') {
        localIndexes.push({
          name: index.name,
          rangeKey: index.sortKey.toString(),
          projectionType,
          nonKeyAttributes,
        });
        continue;
      }

      globalIndexes.push({
        name: index.name,
        hashKey: index.partitionKey.toString(),
        rangeKey: index.sortKey ? index.sortKey.toString() : undefined,
        projectionType,
        nonKeyAttributes,
      });
    }

    return {
      localIndexes,
      globalIndexes,
    };
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
