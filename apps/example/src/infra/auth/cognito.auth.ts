import { CognitoAuthorizer } from '@lafken/api/main';

@CognitoAuthorizer({
  userPool: 'example-user-pool',
  name: 'cognito-auth',
})
export class CognitoAuth {}
