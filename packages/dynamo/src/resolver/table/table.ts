import type { FieldTypes } from '@alicanto/common';
import { alicantoResource, Role } from '@alicanto/resolver';
import { DataAwsCloudwatchEventBus } from '@cdktf/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  DynamodbTable,
  type DynamodbTableAttribute,
  type DynamodbTableGlobalSecondaryIndex,
  type DynamodbTableLocalSecondaryIndex,
} from '@cdktf/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktf/provider-aws/lib/pipes-pipe';
import type { Construct } from 'constructs';
import type {
  DynamoIndex,
  DynamoStream,
  FieldsMetadata,
  ReadWriteCapacity,
} from '../../main';
import { getModelInformation, type ModelMetadata } from '../../service';
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
      attribute: Table.getAttributes(fields, modelProps.ttl as string),
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
      ...Table.getBillingModeProps(modelProps),
    });

    this.isGlobal('dynamo', modelProps.name);

    if (modelProps.stream?.enabled) {
      const defaultBus = new DataAwsCloudwatchEventBus(this, 'DefaultBus', {
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
            resources: [this.streamArn],
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

      const filters = this.createFilterCriteria(modelProps.stream, fields);

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
            maximumRecordAgeInSeconds: -1,
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
          // inputTemplate: '<aws.pipes.event.json>',
        },
      });
    }
  }

  private static getAttributes(fields: FieldsMetadata, ttl?: string) {
    const attributes: DynamodbTableAttribute[] = [];

    for (const key in fields) {
      const field = fields[key];
      const parsedType = mapFieldType[field.type];
      if (!parsedType || field.name === ttl) {
        continue;
      }

      attributes.push({
        name: field.name,
        type: parsedType,
      });
    }

    return attributes;
  }

  private static getBillingModeProps(model: ModelMetadata<any>) {
    if (model.billingMode === 'provisioned') {
      return {
        billingModel: 'PROVISIONED',
        readCapacity: model.readCapacity,
        writeCapacity: model.writeCapacity,
      };
    }

    if (model.billingMode === undefined || model.billingMode === 'pay_per_request') {
      return {
        billingMode: 'PAY_PER_REQUEST',
      };
    }
  }

  private static getIndexes(
    indexes: (DynamoIndex<any> & Partial<ReadWriteCapacity>)[] = []
  ) {
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
        readCapacity: index.readCapacity,
        writeCapacity: index.writeCapacity,
      });
    }

    return {
      localIndexes,
      globalIndexes,
    };
  }

  private createFilterCriteria(stream: DynamoStream<any>, fields: FieldsMetadata) {
    const filters: { pattern: string }[] = [];
    if (!stream.filters) return [];

    if (stream.filters.eventName) {
      filters.push({ pattern: JSON.stringify({ eventName: stream.filters.eventName }) });
    }

    if (stream.filters.keys) {
      filters.push({
        pattern: JSON.stringify({
          dynamodb: {
            Keys: this.getKeyFilterCriteria(stream.filters.keys, fields),
          },
        }),
      });
    }

    if (stream.filters.newImage) {
      filters.push({
        pattern: JSON.stringify({
          dynamodb: {
            NewImage: this.getKeyFilterCriteria(stream.filters.newImage, fields),
          },
        }),
      });
    }

    if (stream.filters.oldImage) {
      filters.push({
        pattern: JSON.stringify({
          dynamodb: {
            OldImage: this.getKeyFilterCriteria(stream.filters.oldImage, fields),
          },
        }),
      });
    }

    return filters;
  }

  private getKeyFilterCriteria(keys: Record<string, any>, fields: FieldsMetadata) {
    return Object.entries(keys).reduce((acc, [key, value]) => {
      const field = fields[key];

      if (!field) {
        throw new Error(`field ${key} not found in dynamo table`);
      }

      const fieldType = mapFieldType[field.type];

      if (!fieldType) {
        throw new Error(`field ${key} has not valid type in filter criteria`);
      }

      acc[key] = {
        [fieldType]: value,
      };

      return acc;
    }, {} as any);
  }
}
