import { createModule } from '@lafken/main';
import { PokeApi } from './api/pokemon.api';
import { PokemonEvent } from './event/pokemon.event';

export default createModule({
  name: 'pokemon-module',
  resources: [PokeApi, PokemonEvent],
});
