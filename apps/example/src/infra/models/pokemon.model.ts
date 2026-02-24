import { Field, Model, PartitionKey, type PrimaryPartition } from '@lafken/dynamo/main';
import { createRepository } from '@lafken/dynamo/service';

@Model({
  name: 'pokemons',
  // indexes: [
  //   {
  //     type: 'local', // TODO: no se puede crear un indice local si no el sortkey
  //     name: 'name_order_index',
  //     sortKey: 'order',
  //     // projection: 'ALL', TODO: all attributes must be indexed. Unused attributes: ["experience"
  //   },
  // ],
})
export class Pokemon {
  @PartitionKey(String)
  name: PrimaryPartition<string>;

  // @Field()
  order: number;

  @Field({ type: [String] })
  types: string[];

  // TODO: Solo se agrega si existe en la tabla
  experience: number;
}

export const pokemonRepository = createRepository(Pokemon);
