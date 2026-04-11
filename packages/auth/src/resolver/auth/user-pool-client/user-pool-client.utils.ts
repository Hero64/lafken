import { CognitoUserPoolClient } from '@cdktn/provider-aws/lib/cognito-user-pool-client';
import { lafkenResource } from '@lafken/resolver';

export class UserPoolClient extends lafkenResource.make(CognitoUserPoolClient) {}
