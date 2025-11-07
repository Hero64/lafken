import type { StripReadonly } from '@alicanto/common';
import { LambdaHandler } from '@alicanto/resolver';
import type { CognitoUserPoolLambdaConfig } from '@cdktf/provider-aws/lib/cognito-user-pool';
import { Construct } from 'constructs';
import type { ExtensionProps } from './extension.types';

export class Extension extends Construct {
  constructor(
    scope: Construct,
    id: string,
    public props: ExtensionProps
  ) {
    super(scope, id);
  }

  public createTriggers(): CognitoUserPoolLambdaConfig {
    const triggers: StripReadonly<CognitoUserPoolLambdaConfig> = {};

    const { handlers, resourceMetadata } = this.props;
    for (const handler of handlers) {
      const lambdaHandler = new LambdaHandler(
        this,
        `${handler.name}-${resourceMetadata.name}`,
        {
          ...handler,
          filename: resourceMetadata.filename,
          foldername: resourceMetadata.foldername,
          principal: 'cognito-idp.amazonaws.com',
          suffix: 'auth',
        }
      );

      switch (handler.type) {
        case 'customEmailSender':
          triggers.customEmailSender = {
            lambdaArn: lambdaHandler.arn,
            lambdaVersion: 'V1_0',
          };
          break;
        case 'customSmsSender':
          triggers.customSmsSender = {
            lambdaArn: lambdaHandler.arn,
            lambdaVersion: 'V1_0',
          };
          break;
        case 'preTokenGenerationConfig':
          triggers.preTokenGenerationConfig = {
            lambdaArn: lambdaHandler.arn,
            lambdaVersion: 'V1_0',
          };
          break;
        default:
          triggers[handler.type] = lambdaHandler.arn;
      }
    }

    return triggers;
  }
}
