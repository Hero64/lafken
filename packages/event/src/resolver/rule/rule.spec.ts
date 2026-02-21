import { CloudwatchEventRule } from '@cdktn/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktn/provider-aws/lib/cloudwatch-event-target';
import { DataAwsCloudwatchEventBus } from '@cdktn/provider-aws/lib/data-aws-cloudwatch-event-bus';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
  type ResourceMetadata,
} from '@lafken/common';
import { LambdaHandler, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { EventRule, type EventRuleMetadata, Rule } from '../../main';
import { Rule as RuleResolver } from './rule';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
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

  it('should create an eventbridge event', async () => {
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
      'rule-TestEvent',
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
