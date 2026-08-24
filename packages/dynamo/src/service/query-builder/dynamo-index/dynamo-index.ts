import type { DynamoIndex, LocalIndex } from '../../../main';
import type { QueryProps } from '../query-builder.types';
import type { GlobalIndexProperty } from './dynamo-index.types';

export class DynamoIndexes {
  private localIndexes: LocalIndex<any>[] = [];
  private globalIndexes: GlobalIndexProperty[] = [];
  private indexByName: Record<string, LocalIndex<any> | GlobalIndexProperty> = {};

  constructor(
    indexes: DynamoIndex<any>[],
    private partitionKey: string,
    private sortKey?: string
  ) {
    for (const index of indexes) {
      if (index.type === 'local') {
        this.indexByName[index.name] = index;
        this.localIndexes.push(index);
        continue;
      }

      const globalIndex: GlobalIndexProperty = {
        ...index,
        type: 'global',
        partitionKey: Array.isArray(index.partitionKey)
          ? new Set([...(index.partitionKey as string[])])
          : new Set([index.partitionKey as string]),
        sortKey: !index.sortKey
          ? new Set()
          : Array.isArray(index.sortKey)
            ? new Set([...(index.sortKey as string[])])
            : new Set([index.sortKey as string]),
      };

      this.indexByName[index.name] = globalIndex;
      this.globalIndexes.push(globalIndex);
    }
  }

  public getIndex(
    props: QueryProps<any>
  ): LocalIndex<any> | GlobalIndexProperty | undefined {
    const {
      keyCondition: { partition, sort },
      indexName,
    } = props;

    if (indexName) {
      const index = this.indexByName[indexName];
      if (!index) {
        throw new Error(`the index "${indexName}" does not exist`);
      }

      return index;
    }

    const partitionKeys = Object.keys(partition).filter(
      (key) => partition[key] !== undefined
    );
    const sortKeys = Object.keys(sort || {}).filter((key) => sort?.[key] !== undefined);

    if (partitionKeys.length > 1 || sortKeys.length > 1) {
      return this.getGlobalIndex(new Set(partitionKeys), new Set(sortKeys));
    }

    if (
      this.partitionKey === partitionKeys[0] &&
      this.sortKey !== sortKeys[0] &&
      sortKeys[0] !== undefined
    ) {
      const index = this.getLocalIndex(sortKeys[0]);

      if (index) {
        return index;
      }
    }

    if (
      this.partitionKey === partitionKeys[0] &&
      (!this.sortKey || sortKeys.length === 0 || this.sortKey === sortKeys[0])
    ) {
      return;
    }

    return this.getGlobalIndex(new Set(partitionKeys), new Set(sortKeys));
  }

  private getLocalIndex(sortKey: string) {
    const index = this.localIndexes.find((index) => index.sortKey === sortKey);

    return index;
  }

  private getGlobalIndex(partitionKeys: Set<string>, sortKeys: Set<string>) {
    const index = this.globalIndexes.find((index) => {
      if (index.partitionKey.size !== partitionKeys.size) {
        return false;
      }

      if (
        this.compareIndexAttributes(index.partitionKey, partitionKeys) &&
        this.compareIndexAttributes(index.sortKey, sortKeys)
      ) {
        return true;
      }

      return false;
    });

    if (!index) {
      throw new Error('no index found for the selected attributes');
    }

    return index;
  }

  private compareIndexAttributes(indexKeys: Set<string>, queryKeys: Set<string>) {
    for (const item of queryKeys) {
      if (!indexKeys.has(item)) {
        return false;
      }
    }

    return true;
  }
}
