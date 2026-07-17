import type { Writable } from 'node:stream';
import { Api, EventProxy, Get } from '@lafken/api/main';
import { ResponseStreaming, Streaming } from '@lafken/common';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { pokemonRepository } from '../../../infra/models/pokemon.model';
import { BasePokemonPayload } from './pokemon.request';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Example of an API Gateway endpoint backed by a Lambda **response-streaming**
 * function.
 *
 * Response streaming only works with a Lambda **proxy** integration, so the
 * method must declare `integrationType: 'aws-proxy'`. In proxy mode API Gateway
 * forwards the raw request and returns the Lambda response verbatim, so:
 * - `@EventProxy(...)` delivers the complete `APIGatewayProxyEvent` (the passed
 *   class is used only to generate the input model / request validation), and
 * - `@ResponseStreaming()` provides the writable stream the handler writes to.
 *
 * `@Streaming()` must be the outermost decorator so the
 * `awslambda.streamifyResponse` marker survives on the exported handler.
 */
@Api({
  path: '/pokemon-stream',
  auth: false,
  bundler: {
    minify: true,
  },
})
export class PokeStreamApi {
  @Streaming()
  @Get({ path: '/{name}', integrationType: 'aws-proxy' })
  async streamPokedexEntry(
    @EventProxy(BasePokemonPayload) event: APIGatewayProxyEvent,
    @ResponseStreaming() responseStream: Writable
  ) {
    const name = event.pathParameters?.name ?? 'unknown';

    // Attach HTTP metadata (status + headers) to the streamed response.
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

    const pokemon = await pokemonRepository.findOne({
      keyCondition: {
        partition: {
          name,
        },
      },
    });

    if (!pokemon) {
      stream.write(`No pokedex entry found for "${name}".`);
      stream.end();
      return;
    }

    const lines = [
      `Pokedex entry for ${pokemon.name}:\n`,
      `- Order: ${pokemon.order}\n`,
      `- Experience: ${pokemon.experience}\n`,
      `- Types: ${pokemon.types.join(', ')}\n`,
    ];

    // Write each line progressively so the client receives the response as a
    // stream instead of a single buffered payload.
    for (const line of lines) {
      stream.write(line);
      await delay(300);
    }

    stream.end();
  }
}
