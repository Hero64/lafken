import { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import { DataAwsCognitoUserPoolClient } from '@cdktn/provider-aws/lib/data-aws-cognito-user-pool-client';
import { lafkenResource } from '@lafken/resolver';

export class DataInternalUserPoolClient extends lafkenResource.make(
  CognitoUserPoolClient
) {}
export class DataExternalUserPoolClient extends lafkenResource.make(
  DataAwsCognitoUserPoolClient
) {}
