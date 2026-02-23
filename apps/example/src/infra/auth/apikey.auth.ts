import { ApiKeyAuthorizer } from '@lafken/api/main';

@ApiKeyAuthorizer({
  name: 'api-key-auth',
  defaultKeys: ['testing'],
})
export class ApiKeyAuth {}
