import { DataAwsCognitoUserPoolClient } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool-client';
import { Construct } from 'constructs';
import type { ExternalUserPoolClientProps } from '../user-pool-client.types';

export class ExternalUserPoolClient extends Construct {
  public cognitoUserPoolClient: DataAwsCognitoUserPoolClient;
  constructor(scope: Construct, id: string, props: ExternalUserPoolClientProps) {
    super(scope, 'user-pool-client');

    this.cognitoUserPoolClient = new DataAwsCognitoUserPoolClient(this, id, {
      clientId: props.clientId,
      userPoolId: props.userPoolId,
    });
  }
}
