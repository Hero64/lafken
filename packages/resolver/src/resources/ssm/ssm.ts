import { DataAwsSsmParameter } from '@cdktn/provider-aws/lib/data-aws-ssm-parameter';
import type { Construct } from 'constructs';

export class SsmFactory {
  private ssmValues: Record<string, DataAwsSsmParameter> = {};

  public getValue(scope: Construct, name: string, secure: boolean = false) {
    if (!this.ssmValues[name]) {
      this.ssmValues[name] = new DataAwsSsmParameter(
        scope,
        `ssm-${name.replaceAll('/', '-')}`,
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
