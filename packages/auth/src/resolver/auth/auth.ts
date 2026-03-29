import { Construct } from 'constructs';
import type { AuthOptions } from '../resolver.types';
import { ExternalUserPool } from './user-pool/external/external';
import { InternalUserPool } from './user-pool/internal/internal';
import { ExternalUserPoolClient } from './user-pool-client/external/external';
import { InternalUserPoolClient } from './user-pool-client/internal/internal';

export class Auth extends Construct {
  private userPool: InternalUserPool | ExternalUserPool;
  private userPoolClient: InternalUserPoolClient | ExternalUserPoolClient;

  constructor(
    scope: Construct,
    private id: string,
    private props: AuthOptions<any>
  ) {
    super(scope, `${id}-auth`);
  }

  public async create() {
    if (this.props.userPool?.isExternal) {
      this.userPool = new ExternalUserPool(this, this.id, this.props.userPool);
    } else {
      this.userPool = new InternalUserPool(this, this.id, this.props.userPool || {});
    }

    if (this.props.userClient?.isExternal) {
      this.userPoolClient = new ExternalUserPoolClient(this, this.id, {
        userPoolId: this.userPool.id,
        ...this.props.userClient,
      });
    } else {
      this.userPoolClient = new InternalUserPoolClient(this, this.id, {
        userPoolId: this.userPool.id,
        ...this.props.userClient,
        attributeByName:
          this.userPool instanceof InternalUserPool ? this.userPool.attributeByName : {},
      });
    }
  }

  public async callExtends() {
    if (this.props.extend) {
      await this.props.extend({
        scope: this,
        userPool: this.userPool,
        userPoolClient: this.userPoolClient.cognitoUserPoolClient,
      });
    }
  }
}
