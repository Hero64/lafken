import { CognitoAuthorizer } from '@lafken/api/main';

@CognitoAuthorizer({
  userPoolArn: Refs.resourceValue('user-pool::poke-auth-user-pool', 'arn'),
  name: 'cognito-auth',
})
export class CognitoAuth {}
