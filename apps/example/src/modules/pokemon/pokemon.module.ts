import { createModule } from '@lafken/main';
import { PokeApi } from './api/pokemon.api';
import { PokemonEvent } from './event/pokemon.event';
import { PokemonStateMachine } from './state-machine/pokemon.state-machine';

export default createModule({
  name: 'pokemon-module',
  resources: [PokeApi, PokemonEvent, PokemonStateMachine],
});
