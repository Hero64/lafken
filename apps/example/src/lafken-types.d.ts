/**
 * Type declarations for Lafken framework resources
 * This file extends the interfaces from @lafken/common to define
 * the available resources for this specific application
 */

declare module '@lafken/common' {
  interface ModulesAvailable {
    'pokemon-module': {};
  }

  interface BucketAvailable {
    'lafken-pokemon-backups': true;
  }

  interface ApiRestAvailable {
    'poke-api': boolean;
  }

  interface ApiAuthorizerAvailable {
    'api-key-auth': true;
    'cognito-auth': true;
  }

  interface DynamoTableAvailable {
    pokemons: true;
  }

  interface AuthAvailable {
    'example-user-pool': true;
  }
}

export {};
