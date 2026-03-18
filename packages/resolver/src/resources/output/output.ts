import { SsmParameter } from '@cdktn/provider-aws/lib/ssm-parameter';
import type { ResourceOutputType } from '@lafken/common';
import { TerraformOutput } from 'cdktn';
import { Construct } from 'constructs';

export class ResourceOutput<T extends string> extends Construct {
  constructor(scope: Construct & Record<T, any>, outputs: ResourceOutputType<T> = []) {
    super(scope, 'output');
    for (const output of outputs) {
      const attributeName = output.type as string;
      switch (output.type) {
        case 'ssm':
          new SsmParameter(this, `ssm_${attributeName}`, {
            description: output.description,
            name: output.name,
            type: output.secure ? 'SecureString' : 'String',
            value: scope[output.value],
          });
          break;
        case 'output': {
          new TerraformOutput(this, output.name, {
            description: output.description,
            value: scope[output.value],
          });
          break;
        }
      }
    }
  }
}
