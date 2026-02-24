import { ApiResponse, ResField } from '@lafken/api/main';

@ApiResponse({
  responses: {
    '400': true,
  },
})
export class PokemonResponse {
  @ResField()
  name: string;

  @ResField()
  order: number;

  @ResField({
    type: [String],
  })
  types: string[];

  @ResField()
  experience: number;
}

@ApiResponse()
export class GetAllResponse {
  @ResField({
    description: 'Get pokemon list',
    type: [PokemonResponse],
  })
  data: PokemonResponse[];
}
