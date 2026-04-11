import { CognitoAuthorizer } from '@lafken/api/main';

@CognitoAuthorizer({
  authName: 'poke-auth',
  name: 'cognito-auth',
})
export class CognitoAuth {}
