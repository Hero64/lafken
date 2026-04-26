import { CognitoAuthorizer } from '@lafken/api/main';

@CognitoAuthorizer({
  userPoolArn({ getResourceValue }) {
    return getResourceValue('user-pool::poke-auth-user-pool', 'arn');
  },
  name: 'cognito-auth',
})
export class CognitoAuth {}
