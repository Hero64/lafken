import { SsmParameter } from '@cdktn/provider-aws/lib/ssm-parameter';
import { Testing } from 'cdktn';
import { Construct } from 'constructs';
import { describe, expect, it } from 'vitest';
import { setupTestingStack } from '../../utils';
import { ResourceOutput } from './output';

class TestResource extends Construct {
  arn = 'arn:aws:apigateway:us-east-1::/restapis/test';
  id = 'api-id';
}

describe('ResourceOutput', () => {
  it('should create an ssm parameter output', () => {
    const { stack } = setupTestingStack();
    const resource = new TestResource(stack, 'resource');

    new ResourceOutput<'arn' | 'id'>(resource, [
      {
        type: 'ssm',
        name: '/api/arn',
        value: 'arn',
        description: 'API ARN',
        secure: true,
      },
    ]);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SsmParameter, {
      description: 'API ARN',
      name: '/api/arn',
      type: 'SecureString',
      value: 'arn:aws:apigateway:us-east-1::/restapis/test',
    });
  });

  it('should create a terraform output', () => {
    const { stack } = setupTestingStack();
    const resource = new TestResource(stack, 'resource');

    new ResourceOutput<'arn' | 'id'>(resource, [
      {
        type: 'output',
        name: 'api_id',
        value: 'id',
        description: 'API identifier',
      },
    ]);

    const synthesized = JSON.parse(Testing.synth(stack)) as {
      output?: Record<string, { description?: string; value?: string }>;
    };

    expect(Object.values(synthesized.output ?? {})).toContainEqual({
      description: 'API identifier',
      value: 'api-id',
    });
  });

  it('should not create outputs when definitions are omitted', () => {
    const { stack } = setupTestingStack();
    const resource = new TestResource(stack, 'resource');

    new ResourceOutput<'arn' | 'id'>(resource);

    const synthesized = JSON.parse(Testing.synth(stack)) as {
      output?: Record<string, unknown>;
      resource?: Record<string, unknown>;
    };

    expect(synthesized.output ?? {}).toStrictEqual({});
    expect(synthesized.resource?.aws_ssm_parameter ?? {}).toStrictEqual({});
  });
});
