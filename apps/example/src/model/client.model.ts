import {
  Field,
  Model,
  PartitionKey,
  type PrimaryPartition,
  SortKey,
} from '@alicanto/dynamo/main';

@Model({
  name: 'clients',
  indexes: [
    {
      type: 'local',
      name: 'email_age_index',
      sortKey: 'age',
    },
  ],
  ttl: 'expireAt',
  stream: {
    enabled: true,
    type: 'NEW_IMAGE',
    filters: {
      keys: {
        email: [{ prefix: 'cc' }],
      },
      newImage: {
        name: ['anibal'],
      },
    },
  },
})
export class Client {
  @PartitionKey(String)
  email: PrimaryPartition<string>;

  @SortKey(String)
  name: PrimaryPartition<string>;

  @Field()
  age: number;

  @Field()
  expireAt: number;
}
