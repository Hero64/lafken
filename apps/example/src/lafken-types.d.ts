/**
 * Type declarations for Lafken framework resources
 * This file extends the interfaces from @lafken/common to define
 * the available resources for this specific application
 */

declare module '@lafken/common' {
  interface SharedResourceNames {
    api: 'poke-api';
    'api-authorizer': 'cognito-auth' | 'pokemon-custom-auth' | 'poke-auth';
  }

  interface SharedReferenceResources {
    'user-pool': 'poke-auth-user-pool';
    queue: 'create-pokemon';
    dynamo: 'pokemons';
    'state-machine': 'get-pokemon';
  }
}

export {};
