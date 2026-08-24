import { createModule } from '@lafken/main';
import { PokeApi } from './api/pokemon.api';
import { PokeStreamApi } from './api/pokemon.stream';
import { PokemonEvent } from './event/pokemon.event';
import { PokemonQueue } from './queue/pokemon.queue';
import { PokemonStateMachine } from './state-machine/pokemon.state-machine';

export default createModule({
  name: 'pokemon-module',
  resources: [PokeApi, PokeStreamApi, PokemonEvent, PokemonStateMachine, PokemonQueue],
});
