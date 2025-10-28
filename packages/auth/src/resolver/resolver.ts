import type { ClassResource } from '@alicanto/common';
import type { AppModule, ResolverType } from '@alicanto/resolver';
import { RESOURCE_TYPE } from '../main/extension/extension';
import { Auth } from './auth/auth';
import type { AuthOptions } from './resolver.types';

export class AuthResolver<T extends ClassResource = ClassResource>
  implements ResolverType
{
  public type = RESOURCE_TYPE;
  private auth: Auth;

  constructor(protected options: AuthOptions<T>) {}

  public async beforeCreate(scope: AppModule) {
    this.auth = new Auth(scope, this.options.name, this.options);
    await this.auth.create();
  }

  public async create() {
    throw new Error('It is not possible to parse this service');
  }

  public async afterCreate() {
    await this.auth.callExtends();
  }
}
