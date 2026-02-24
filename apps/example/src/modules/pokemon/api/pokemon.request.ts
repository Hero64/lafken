import { ApiRequest, BodyParam, PathParam } from '@lafken/api/main';

@ApiRequest()
export class BasePokemonPayload {
  @PathParam()
  name: string;
}

export class UpsertPokemonBase {
  @BodyParam({
    min: 1,
  })
  order: number;

  @BodyParam({
    type: [String],
  })
  types: string[];

  @BodyParam({
    min: 0,
  })
  experience: number;
}

@ApiRequest()
export class CreatePokemonPayload extends UpsertPokemonBase {
  @BodyParam({
    minLength: 2,
    maxLength: 100,
  })
  name: string;
}

@ApiRequest()
export class UpdatePokemonPayload extends UpsertPokemonBase {
  @PathParam()
  name: string;
}
