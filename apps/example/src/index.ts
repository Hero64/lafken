import { ApiResolver } from '@lafken/api/resolver';
import { AuthResolver } from '@lafken/auth/resolver';
import { BucketResolver } from '@lafken/bucket/resolver';
import { DynamoResolver } from '@lafken/dynamo/resolver';
import { EventRuleResolver } from '@lafken/event/resolver';
import { createApp } from '@lafken/main';
import { QueueResolver } from '@lafken/queue/resolver';
import { StateMachineResolver } from '@lafken/state-machine/resolver';
import { TrainerAuthorizer } from './auth/pokemon-custom.auth';
import { CognitoAuth } from './infra/auth/cognito.auth';
import { PokemonBackupsBucket } from './infra/buckets/pokemon-backups.bucket';
import { Pokemon } from './infra/models/pokemon.model';
import PokemonModule from './modules/pokemon/pokemon.module';

createApp({
  globalConfig: {
    lambda: {
      runtime: 24,
    },
    minify: false,
  },
  name: 'pokemon-example',
  modules: [PokemonModule],
  resolvers: [
    new BucketResolver([PokemonBackupsBucket]),
    new DynamoResolver([Pokemon]),
    new EventRuleResolver(),
    new QueueResolver(),
    new StateMachineResolver(),
    new AuthResolver({
      name: 'poke-auth',
      userPool: {
        signInAliases: ['preferred_username'],
      },
      userClient: {
        authFlows: ['allow_user_password_auth', 'allow_refresh_token_auth'],
      },
    }),
    new ApiResolver({
      restApi: {
        name: 'poke-api',
        auth: {
          authorizers: [TrainerAuthorizer, CognitoAuth],
          defaultAuthorizerName: 'pokemon-custom-auth',
        },
        defaultResponses: {
          badRequestBody: {
            message: '$context.error.validationErrorString',
          },
        },
        outputs: [
          {
            name: '/example/api/arn',
            type: 'ssm',
            value: 'arn',
          },
        ],
      },
    }),
  ],
});
