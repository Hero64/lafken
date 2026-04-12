import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  Api,
  Delete,
  Event,
  Get,
  IntegrationOptions,
  Post,
  Put,
  type QueueIntegrationOption,
  type QueueSendMessageIntegrationResponse,
  response,
} from '@lafken/api/main';
import { pokemonRepository } from '../../../infra/models/pokemon.model';
import {
  BasePokemonPayload,
  CreatePokemonPayload,
  UpdatePokemonPayload,
} from './pokemon.request';
import { GetAllResponse, PokemonResponse } from './pokemon.responses';

const sqsClient = new SQSClient();

@Api({
  path: '/pokemon',
  auth: false,
})
export class PokeApi {
  @Get({
    response: GetAllResponse,
  })
  async getAllPokemons(): Promise<GetAllResponse> {
    const { data } = await pokemonRepository.scan();
    return {
      data,
    };
  }

  @Get({
    path: '/{name}',
    auth: {
      authorizerName: 'cognito-auth',
    },
    response: PokemonResponse,
  })
  async getPokemon(
    @Event(BasePokemonPayload) e: BasePokemonPayload
  ): Promise<PokemonResponse | undefined> {
    const pokemon = await pokemonRepository.findOne({
      keyCondition: {
        partition: {
          name: e.name,
        },
      },
    });

    if (!pokemon) {
      response(400);
    }

    return pokemon;
  }

  @Post({
    response: PokemonResponse,
    lambda: {
      env: ({ getResourceValue }) => ({
        queueArn: getResourceValue('pokemon-module::queue::createPokemon', 'id'),
      }),
    },
  })
  async createPokemon(@Event(CreatePokemonPayload) e: CreatePokemonPayload) {
    const pokemon = await pokemonRepository.create(e);
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.queueArn,
        MessageBody: 'Hello',
      })
    );
    return pokemon;
  }

  @Put({
    path: '/{name}',
    response: Boolean,
  })
  async updatePokemon(
    @Event(UpdatePokemonPayload) e: UpdatePokemonPayload
  ): Promise<boolean> {
    const updated = await pokemonRepository.update({
      keyCondition: {
        name: e.name,
      },
      replaceValues: {
        experience: e.experience,
        types: e.types,
        order: e.order,
      },
      returnValue: 'all_new',
    });

    return !!updated;
  }

  @Delete({
    path: '/{name}',
  })
  async deletePokemon(@Event(BasePokemonPayload) e: BasePokemonPayload) {
    await pokemonRepository.delete({
      name: e.name,
    });
  }

  @Get({
    path: '/what-is-this/{name}',
    auth: {
      authorizerName: 'pokemon-custom-auth',
    },
  })
  async whatIsThisPokemon(@Event(BasePokemonPayload) e: BasePokemonPayload) {
    return `It's ${e.name}!!!`;
  }

  @Get({
    path: '/view-pokedex',
    integration: 'queue',
    action: 'SendMessage',
  })
  async viewPokedex(
    @IntegrationOptions() { getResourceValue }: QueueIntegrationOption
  ): Promise<QueueSendMessageIntegrationResponse> {
    return {
      queueName: getResourceValue('pokemon-module::queue::createPokemon', 'name'),
      body: 'view pokedex',
    };
  }
}
