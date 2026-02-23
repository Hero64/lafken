import { Param, Payload } from '@lafken/api/main';

@Payload()
export class BasePokemonPayload {
  @Param({
    source: 'path',
  })
  name: string;
}

export class UpsertPokemonBase {
  @Param({
    source: 'body',
    validation: {
      minimum: 1,
    },
  })
  order: number;

  @Param({
    source: 'body',
    type: [String],
  })
  types: string[];

  @Param({
    source: 'body',
    validation: {
      minimum: 0,
    },
  })
  experience: number;
}

@Payload()
export class CreatePokemonPayload extends UpsertPokemonBase {
  @Param({
    source: 'body',
    validation: {
      maxLength: 2,
      minLength: 100,
    },
  })
  name: string;
}

@Payload()
export class UpdatePokemonPayload extends UpsertPokemonBase {
  @Param({
    source: 'path',
  })
  name: string;
}
