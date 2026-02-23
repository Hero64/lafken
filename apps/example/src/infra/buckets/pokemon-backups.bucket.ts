import { Bucket } from '@lafken/bucket/main';
import { createRepository } from '@lafken/bucket/service';

@Bucket({
  name: 'lafken-pokemon-backups',
  forceDestroy: true,
  eventBridgeEnabled: true,
})
export class PokemonBackupsBucket {}

export const pokemonBackupRepository = createRepository(PokemonBackupsBucket);
