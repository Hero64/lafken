import { Queue, Standard } from '@lafken/queue/main';

@Queue()
export class PokemonQueue {
  @Standard({
    ref: 'create-pokemon',
  })
  createPokemon() {
    console.log('pokemon created');
  }
}
