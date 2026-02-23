import { Field, Model, PartitionKey, type PrimaryPartition } from '@lafken/dynamo/main';
import { createRepository } from '@lafken/dynamo/service';

@Model({
  name: 'pokemons',
  indexes: [
    {
      type: 'local',
      name: 'name_order_index',
      sortKey: 'order',
      projection: 'ALL',
    },
  ],
})
export class Pokemon {
  @PartitionKey(String)
  name: PrimaryPartition<string>;

  @Field()
  order: number;

  @Field({ type: [String] })
  types: string[];

  @Field()
  experience: number;
}

export const pokemonRepository = createRepository(Pokemon);
