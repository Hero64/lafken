import { CognitoAuthorizer } from '@lafken/api/main';
import { getResourceValue } from '@lafken/common';

@CognitoAuthorizer({
  userPoolArn: getResourceValue('user-pool::poke-auth-user-pool', 'arn'),
  name: 'cognito-auth',
})
export class CognitoAuth {}
