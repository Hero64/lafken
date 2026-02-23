import { createModule } from '@lafken/main';
import { PokeApi } from './api/pokemon.api';

export default createModule({
  name: 'pokemon-module',
  resources: [PokeApi],
});
