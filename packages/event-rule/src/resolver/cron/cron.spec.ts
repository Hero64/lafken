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
import { Testing } from 'cdktf';
import { Cron, type EventCronMetadata, EventRule } from '../../main';
import { Cron as CronResolver } from './cron';

jest.mock('@alicanto/resolver', () => {
  const actual = jest.requireActual('@alicanto/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
    })),
  };
});

describe('Cron', () => {
  enableBuildEnvVariable();

  @EventRule()
  class TestEvent {
    @Cron({
      schedule: {
        day: 10,
        hour: 11,
      },
    })
    cron() {}
  }

  const metadata: ResourceMetadata = getResourceMetadata(TestEvent);
  const handlers = getResourceHandlerMetadata<EventCronMetadata>(TestEvent);

  it('should create a eventbridge schedule', async () => {
    const { stack, module } = setupTestingStackWithModule();

    new CronResolver(module, 'cron', {
      handler: handlers[0],
      resourceMetadata: metadata,
    });

    const synthesized = Testing.synth(stack);

    expect(LambdaHandler).toHaveBeenCalledWith(
      expect.anything(),
      'handler',
      expect.objectContaining({
        filename: metadata.filename,
        schedule: { day: 10, hour: 11 },
        name: 'cron',
        foldername: metadata.foldername,
        suffix: 'event',
      })
    );

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
      name: 'cron',
      schedule_expression: 'cron(* 11 10 * * *)',
    });

    expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
      arn: 'test-function',
      rule: '${aws_cloudwatch_event_rule.testing_cron-cron_3E870998.name}',
    });
  });
});
