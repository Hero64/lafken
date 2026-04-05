import { Queue, Standard } from '@lafken/queue/main';

@Queue()
export class PokemonQueue {
  @Standard()
  createPokemon() {
    console.log('pokemon created');
  }
}
