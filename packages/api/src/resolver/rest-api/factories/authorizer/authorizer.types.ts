import type { ClassResource } from '@alicanto/common';
import type {
  ApiAuthorizerType,
  ApiKeyAuthorizerMetadata,
  CognitoAuthorizerMetadata,
  CustomAuthorizerMetadata,
} from '../../../../main';

export interface AuthorizerDataCustom {
  type: ApiAuthorizerType.custom;
  metadata: CustomAuthorizerMetadata;
  resource: ClassResource;
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
