import { getExternalValues } from '@lafken/resolver';
import { Construct } from 'constructs';
import type { ExternalUserPoolClientProps } from '../user-pool-client.types';
import { DataExternalUserPoolClient } from '../user-pool-client.utils';

export class ExternalUserPoolClient extends Construct {
  public cognitoUserPoolClient: DataExternalUserPoolClient;
  constructor(scope: Construct, id: string, props: ExternalUserPoolClientProps) {
    super(scope, 'user-pool-client');

    this.cognitoUserPoolClient = new DataExternalUserPoolClient(this, id, {
      clientId:
        typeof props.clientId === 'string'
          ? props.clientId
          : props.clientId(getExternalValues(scope)),
      userPoolId: props.userPoolId,
    });

    this.cognitoUserPoolClient.isGlobal('user-pool-client', id);
  }
}
