import 'cdktf/lib/testing/adapters/jest';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@alicanto/common';
import { LambdaHandler, setupTestingStackWithModule } from '@alicanto/resolver';
import { CloudwatchEventRule } from '@cdktf/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktf/provider-aws/lib/cloudwatch-event-target';
import { DataAwsCloudwatchEventBus } from '@cdktf/provider-aws/lib/data-aws-cloudwatch-event-bus';
import { Testing } from 'cdktf';
import { EventRule, type EventRuleMetadata, Rule } from '../../main';
import { Rule as RuleResolver } from './rule';

jest.mock('@alicanto/resolver', () => {
  const actual = jest.requireActual('@alicanto/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
    })),
  };
});

describe('Rule', () => {
  enableBuildEnvVariable();

  @EventRule()
  class TestEvent {
    @Rule({
      pattern: {
        source: 'foo.bar',
      },
    })
    rule() {}
  }

  const metadata: ResourceMetadata = getResourceMetadata(TestEvent);
  const handlers = getResourceHandlerMetadata<EventRuleMetadata>(TestEvent);

  it('should create a eventbridge event', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const defaultBus = new DataAwsCloudwatchEventBus(stack, 'DefaultBus', {
      name: 'default',
    });

    new RuleResolver(module, 'rule', {
      handler: handlers[0],
      resourceMetadata: metadata,
      bus: defaultBus as any,
    });

    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'handler',
      expect.objectContaining({
        filename: metadata.filename,
        pattern: { source: 'foo.bar' },
        name: 'rule',
        foldername: metadata.foldername,
        suffix: 'event',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
      event_bus_name: '${data.aws_cloudwatch_event_bus.DefaultBus.name}',
      event_pattern: '${jsonencode({"source" = ["foo.bar"]})}',
      name: 'rule',
    });

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
      arn: 'test-function',
      input_path: '$.detail',
      rule: '${aws_cloudwatch_event_rule.testing_rule-rule_B1F6180D.name}',
    });
  });
});
