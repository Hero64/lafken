import { ApiKeyAuthorizer } from '@alicanto/api/main';

@ApiKeyAuthorizer({
  name: 'api-key-auth',
  defaultKeys: ['testing'],
})
export class ApiKeyAuth {}
