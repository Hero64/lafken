import { IntegrationOptions } from '@lafken/api/main';
import {
  Event,
  type IntegrationOptionsParams,
  State,
  StateMachine,
} from '@lafken/state-machine/main';

@StateMachine({
  startAt: 'getPokemon',
  services: ['dynamodb'],
})
export class PokemonStateMachine {
  @State({
    integrationResource: 'arn:aws:states:::dynamodb:getItem',
    next: 'showPokemon',
    output: '{% $states.result.Item %}',
  })
  getPokemon(@IntegrationOptions() { getResourceValue }: IntegrationOptionsParams) {
    return {
      TableName: getResourceValue('dynamo::pokemons', 'id'),
      Key: {
        name: {
          S: '{% $states.input.name %}',
        },
      },
    };
  }

  @State({
    end: true,
  })
  showPokemon(@Event('{% $states.input %}') e: any) {
    console.log(e);
  }
}
