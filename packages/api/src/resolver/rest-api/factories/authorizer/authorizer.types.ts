import type { ClassResource, ResourceMetadata } from '@alicanto/common';
import type {
  ApiAuthorizerType,
  ApiKeyAuthorizerMetadata,
  CognitoAuthorizerMetadata,
  CustomAuthorizerMetadata,
  Method,
  MethodAuthorizer,
} from '../../../../main';

export type PathScopes = Record<string, Partial<Record<Method, string[]>>>;
export interface AuthPermissions
  extends Pick<ResourceMetadata, 'filename' | 'foldername'> {
  pathScopes: PathScopes;
}

export interface AuthorizerDataCustom {
  type: ApiAuthorizerType.custom;
  metadata: CustomAuthorizerMetadata;
  resource: ClassResource;
  pathScopes?: PathScopes;
}

export interface AuthorizerDataCognito {
  type: ApiAuthorizerType.cognito;
  metadata: CognitoAuthorizerMetadata;
  resource: ClassResource;
}

export interface AuthorizerDataApiKey {
  type: ApiAuthorizerType.apiKey;
  metadata: ApiKeyAuthorizerMetadata;
  resource: ClassResource;
}

export type AuthorizerData =
  | AuthorizerDataCustom
  | AuthorizerDataCognito
  | AuthorizerDataApiKey;

export interface GetAuthorizerProps {
  fullPath: string;
  method: Method;
  authorizer?: MethodAuthorizer | false;
}
