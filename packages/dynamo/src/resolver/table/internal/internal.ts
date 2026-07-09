import { DataAwsCloudwatchEventBus } from '@cdktn/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  DynamodbTable,
  type DynamodbTableAttribute,
  type DynamodbTableGlobalSecondaryIndex,
  type DynamodbTableGlobalSecondaryIndexKeySchema,
  type DynamodbTableLocalSecondaryIndex,
} from '@cdktn/provider-aws/lib/dynamodb-table';
import { PipesPipe } from '@cdktn/provider-aws/lib/pipes-pipe';
import type { FieldTypes } from '@lafken/common';
import { lafkenResource, ResourceOutput, Role } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type {
  DynamoIndex,
  DynamoStream,
  FieldsMetadata,
  ReadWriteCapacity,
  TableOutputAttributes,
} from '../../../main';
import { getModelInformation, type ModelMetadata } from '../../../service';
import type { InternalTableProps } from '../table.types';

const mapFieldType: Partial<Record<FieldTypes, string>> = {
  String: 'S',
  Number: 'N',
};

export class InternalTable extends lafkenResource.make(DynamodbTable) {
  constructor(scope: Construct, props: InternalTableProps) {
    const {
      modelProps,
      partitionKey: partitionKeyName,
      sortKey: sortKeyName,
      fields,
    } = getModelInformation(props.classResource);

    const { globalIndexes, localIndexes, indexAttributes } = InternalTable.getIndexes(
      modelProps.indexes,
      sortKeyName
    );

    const availableAttributes = new Set([...(indexAttributes || new Set())]);

    availableAttributes.add(partitionKeyName.toString());
    if (sortKeyName) {
      availableAttributes.add(sortKeyName.toString());
    }

    super(scope, `${modelProps.name}-table`, {
      name: modelProps.name,
      rangeKey: sortKeyName,
      hashKey: partitionKeyName,
      attribute: InternalTable.getAttributes(
        fields,
        availableAttributes,
        modelProps.ttl as string
      ),
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
      ...InternalTable.getBillingModeProps(modelProps),
      replica: modelProps.replica,
    });

    if (modelProps.ref) {
      this.register('dynamo', modelProps.ref);
    }

    if (modelProps.stream?.enabled) {
      const defaultBus = new DataAwsCloudwatchEventBus(this, 'DefaultBus', {
        name: 'default',
      });

      const role = new Role(this, `pipe-dynamo-${modelProps.name}-role`, {
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

      new PipesPipe(this, `${modelProps.name}-pipe`, {
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
        },
      });
    }

    new ResourceOutput<TableOutputAttributes>(this, modelProps.outputs);
  }

  private static getAttributes(
    fields: FieldsMetadata,
    indexAttributes: Set<string>,
    ttl?: string
  ) {
    const attributes: DynamodbTableAttribute[] = [];

    for (const key in fields) {
      const field = fields[key];
      const parsedType = mapFieldType[field.type];
      if (!parsedType || !indexAttributes.has(field.name) || field.name === ttl) {
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

  private static toKeys(key: PropertyKey | PropertyKey[]): string[] {
    return Array.isArray(key) ? key.map((k) => k.toString()) : [key.toString()];
  }

  private static getIndexes(
    indexes: (DynamoIndex<any> & Partial<ReadWriteCapacity>)[] = [],
    sortKeyName?: string
  ) {
    if (indexes.length === 0) {
      return {};
    }
    const indexAttributes = new Set<string>([]);

    const globalIndexes: DynamodbTableGlobalSecondaryIndex[] = [];
    const localIndexes: DynamodbTableLocalSecondaryIndex[] = [];

    for (const index of indexes) {
      const projectionType = 'ALL';
      let nonKeyAttributes: string[] | undefined;
      if (Array.isArray(index.projection)) {
        nonKeyAttributes = index.projection as string[];
      }

      if (index.type === 'local') {
        if (!sortKeyName) {
          throw new Error(
            'It is not possible to add a local secondary index without an associated sort key.'
          );
        }
        indexAttributes.add(index.sortKey.toString());
        localIndexes.push({
          name: index.name,
          rangeKey: index.sortKey.toString(),
          projectionType,
          nonKeyAttributes,
        });
        continue;
      }

      const partitionKeys = InternalTable.toKeys(index.partitionKey);
      const sortKeys = index.sortKey ? InternalTable.toKeys(index.sortKey) : [];

      for (const attribute of [...partitionKeys, ...sortKeys]) {
        indexAttributes.add(attribute);
      }

      const isMultiAttribute = partitionKeys.length > 1 || sortKeys.length > 1;

      if (isMultiAttribute) {
        if (partitionKeys.length > 4 || sortKeys.length > 4) {
          throw new Error(
            `A multi-attribute index supports up to 4 partition and 4 sort attributes. Check the index "${index.name}".`
          );
        }

        globalIndexes.push({
          name: index.name,
          keySchema: [
            ...partitionKeys.map(
              (attributeName): DynamodbTableGlobalSecondaryIndexKeySchema => ({
                attributeName,
                keyType: 'HASH',
              })
            ),
            ...sortKeys.map(
              (attributeName): DynamodbTableGlobalSecondaryIndexKeySchema => ({
                attributeName,
                keyType: 'RANGE',
              })
            ),
          ],
          projectionType,
          nonKeyAttributes,
          readCapacity: index.readCapacity,
          writeCapacity: index.writeCapacity,
        });
        continue;
      }

      globalIndexes.push({
        name: index.name,
        hashKey: partitionKeys[0],
        rangeKey: sortKeys[0],
        projectionType,
        nonKeyAttributes,
        readCapacity: index.readCapacity,
        writeCapacity: index.writeCapacity,
      });
    }

    return {
      indexAttributes,
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
