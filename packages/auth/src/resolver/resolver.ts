import type { ClassResource } from '@lafken/common';
import type { AppModule, ResolverType } from '@lafken/resolver';
import { Annotations } from 'cdktn';
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
    this.auth.create();
  }

  public async create(module: AppModule) {
    Annotations.of(module).addError(
      `Module "${module.id}" registers an auth resource, but auth resources are not created from module resources. Pass @AuthExtension classes through the "extensions" option of the user pool.`
    );
  }

  public async afterCreate() {
    await this.auth.callExtends();
  }
}
