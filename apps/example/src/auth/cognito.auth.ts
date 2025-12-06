import { CognitoAuthorizer } from '@alicanto/api/main';

@CognitoAuthorizer({
  userPool: 'example-user-pool',
  name: 'cognito-auth',
})
export class CognitoAuth {}
