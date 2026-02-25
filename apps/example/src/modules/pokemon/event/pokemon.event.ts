import { Event, EventRule, Rule } from '@lafken/event/main';

@EventRule()
export class PokemonEvent {
  @Rule({
    integration: 'dynamodb',
    pattern: {
      source: 'pokemons',
    },
  })
  createOrUpdatePokemon(@Event() e: any) {
    console.log(e);
  }
}
