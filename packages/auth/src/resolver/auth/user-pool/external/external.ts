import { DataAwsCognitoUserPool } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool';
import { lafkenResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ExternalUserPoolProps } from '../user-pool.types';

export class ExternalUserPool extends lafkenResource.make(DataAwsCognitoUserPool) {
  constructor(scope: Construct, id: string, props: ExternalUserPoolProps) {
    super(scope, `${id}-user-pool`, {
      userPoolId: props.userPoolId,
    });

    this.isGlobal('auth', id);
  }
}
