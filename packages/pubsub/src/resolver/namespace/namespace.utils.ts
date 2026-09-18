import type { ChannelAuthorizer } from '../../main';
import type { AuthorizerFactory } from '../authorizer';

export const sanitizeName = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_');

export const buildAuthMode = (
  authorizerFactory: AuthorizerFactory,
  auth?: ChannelAuthorizer | false
) => {
  if (auth === false) {
    return undefined;
  }

  const authorizerName = auth?.authorizerName ?? authorizerFactory.defaultAuthorizerName;

  if (!authorizerName) {
    return undefined;
  }

  return [{ authType: authorizerFactory.getAuthType(authorizerName) }];
};
