import { Field, PartitionKey, type PrimaryPartition, Table } from '@lafken/dynamo/main';
import { createRepository } from '@lafken/dynamo/service';

@Table({
  name: 'pokemons',
  stream: {
    enabled: true,
    type: 'NEW_AND_OLD_IMAGES',
  },
  ref: 'pokemons',
  // indexes: [
  //   {
  //     type: 'local',
  //     name: 'name_order_index',
  //     sortKey: 'experience',
  //     projection: 'ALL',
  //   },
  // ],
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
