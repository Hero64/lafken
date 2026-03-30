import { DataAwsSsmParameter } from '@cdktn/provider-aws/lib/data-aws-ssm-parameter';
import type { Construct } from 'constructs';

export class SsmFactory {
  private ssmValues: Record<string, DataAwsSsmParameter> = {};

  public getValue(scope: Construct, name: string, secure: boolean) {
    if (!this.ssmValues[name]) {
      this.ssmValues[name] = new DataAwsSsmParameter(
        scope,
        `${name.replaceAll('/', '-')}-ssm`,
        {
          name,
          withDecryption: secure,
        }
      );
    }

    return this.ssmValues[name].value;
  }
}

export const ssmFactory = new SsmFactory();
