import { Api, Delete, Event, Get, Post, Put, response } from '@lafken/api/main';
import { pokemonRepository } from '../../../infra/models/pokemon.model';
import {
  BasePokemonPayload,
  CreatePokemonPayload,
  UpdatePokemonPayload,
} from './pokemon.request';
import { GetAllResponse, PokemonResponse } from './pokemon.responses';

@Api({
  path: '/pokemon',
})
export class PokeApi {
  @Get({
    response: GetAllResponse,
  })
  async getAllPokemons(): Promise<GetAllResponse> {
    const { data } = await pokemonRepository.scan().exec();

    return {
      data,
    };
  }

  @Get({
    path: '/{name}',
    response: PokemonResponse,
  })
  async getPokemon(
    @Event(BasePokemonPayload) e: BasePokemonPayload
  ): Promise<PokemonResponse | undefined> {
    const pokemon = await pokemonRepository
      .findOne({
        keyCondition: {
          partition: {
            name: e.name,
          },
        },
      })
      .exec();

    if (!pokemon) {
      response(400);
    }

    return pokemon;
  }

  @Post({
    response: PokemonResponse,
  })
  async createPokemon(@Event(CreatePokemonPayload) e: CreatePokemonPayload) {
    const pokemon = await pokemonRepository.create(e).exec();

    return pokemon;
  }

  @Put({
    path: '/{name}',
    // response: Boolean, TODO: ver la posibilidad de retornar valores normales
  })
  async updatePokemon(@Event(UpdatePokemonPayload) e: UpdatePokemonPayload) {
    const updated = await pokemonRepository
      .update({
        // TODO: agregar only if exist
        keyCondition: {
          name: e.name,
        },
        replaceValues: {
          experience: e.experience,
          types: e.types,
          order: e.order,
        },
      })
      .exec();

    return updated;
  }

  @Delete({
    path: '/{name}',
  })
  async deletePokemon(@Event(BasePokemonPayload) e: BasePokemonPayload) {
    await pokemonRepository
      .delete({
        name: e.name,
      })
      .exec();
  }
}
