import type { LambdaMetadata, LambdaProps, ResourceMetadata } from '@alicanto/common';

export type TriggerType =
  | 'preAuthentication'
  | 'preSignUp'
  | 'preTokenGeneration'
  | 'preTokenGenerationConfig'
  | 'userMigration'
  | 'postAuthentication'
  | 'postConfirmation'
  | 'createAuthChallenge'
  | 'defineAuthChallenge'
  | 'customMessage'
  | 'customEmailSender'
  | 'customSmsSender'
  | 'verifyAuthChallengeResponse';

export interface ExtensionsProps {
  name?: string;
}

export interface ExtensionsMetadata extends ResourceMetadata {}

export interface TriggerProps {
  lambda?: LambdaProps;
  type: TriggerType;
}

export interface TriggerMetadata extends LambdaMetadata {
  type: TriggerType;
}
