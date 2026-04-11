import { DataAwsCognitoUserPoolClient } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool-client';
import { getExternalValues } from '@lafken/resolver';
import { Construct } from 'constructs';
import type { ExternalUserPoolClientProps } from '../user-pool-client.types';

export class ExternalUserPoolClient extends Construct {
  public cognitoUserPoolClient: DataAwsCognitoUserPoolClient;
  constructor(scope: Construct, id: string, props: ExternalUserPoolClientProps) {
    super(scope, 'user-pool-client');

    this.cognitoUserPoolClient = new DataAwsCognitoUserPoolClient(this, id, {
      clientId:
        typeof props.clientId === 'string'
          ? props.clientId
          : props.clientId(getExternalValues(scope)),
      userPoolId: props.userPoolId,
    });
  }
}
