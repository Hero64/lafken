import { Construct } from 'constructs';
import type { AuthOptions } from '../resolver.types';
import { UserPool } from './user-pool/user-pool';
import { UserPoolClient } from './user-pool-client/user-pool-client';

export class Auth extends Construct {
  private userPool: UserPool;
  private userPoolClient: UserPoolClient;

  constructor(
    scope: Construct,
    private id: string,
    private props: AuthOptions<any>
  ) {
    super(scope, `${id}-auth`);
  }

  public async create() {
    this.userPool = new UserPool(this, this.id, {
      ...(this.props.userPool || {}),
      extensions: this.props.extensions,
    });

    this.userPoolClient = new UserPoolClient(this, this.id, {
      ...this.props.userClient,
      userPoolId: this.userPool.id,
      attributeByName: this.userPool.attributeByName,
    });
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
