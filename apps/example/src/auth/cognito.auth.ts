import { CognitoAuthorizer } from '@lafken/api/main';
import { Refs } from '@lafken/common';

@CognitoAuthorizer({
  userPoolArn: Refs.resourceValue('user-pool::poke-auth-user-pool', 'arn'),
  name: 'cognito-auth',
})
export class CognitoAuth {}
