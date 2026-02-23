import { Field, Response } from '@lafken/api/main';

@Response({
  responses: {
    '400': true,
  },
})
export class PokemonResponse {
  @Field()
  name: string;

  @Field()
  order: number;

  @Field({
    type: [String],
  })
  types: string[];

  @Field()
  experience: number;
}

@Response({})
export class GetAllResponse {
  @Field({
    source: 'body',
    type: [PokemonResponse],
  })
  data: PokemonResponse[];
}
