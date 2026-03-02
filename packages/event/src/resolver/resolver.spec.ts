import { CloudwatchEventBus } from '@cdktn/provider-aws/lib/cloudwatch-event-bus';
import { CloudwatchEventRule } from '@cdktn/provider-aws/lib/cloudwatch-event-rule';
import { CloudwatchEventTarget } from '@cdktn/provider-aws/lib/cloudwatch-event-target';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  LambdaHandler,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { EventRule, Rule } from '../main';
import { EventRuleResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
    }),
  };
});

describe('event resolver', () => {
  enableBuildEnvVariable();

  describe('beforeCreate', () => {
    it('should create a default event bus without errors', async () => {
      const { stack } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await expect(
        resolver.beforeCreate(stack as unknown as AppStack)
      ).resolves.not.toThrow();
    });

    it('should create a custom event bus', async () => {
      const { stack } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver({
        busName: 'custom-bus',
      });

      await resolver.beforeCreate(stack as unknown as AppStack);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventBus, {
        name: 'custom-bus',
      });
    });

    it('should create multiple custom event buses', async () => {
      const { stack } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver({ busName: 'bus-a' }, { busName: 'bus-b' });

      await resolver.beforeCreate(stack as unknown as AppStack);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventBus, {
        name: 'bus-a',
      });
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventBus, {
        name: 'bus-b',
      });
    });

    it('should throw error when bus name is default', async () => {
      const { stack } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver({
        busName: 'default',
      });

      await expect(resolver.beforeCreate(stack as unknown as AppStack)).rejects.toThrow(
        'Event bus default already exist'
      );
    });
  });

  describe('create', () => {
    it('should create an event rule on the default bus', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          pattern: {
            source: 'my.service',
          },
        })
        onEvent() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'onEvent-TestEvent',
      });
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
        arn: 'test-function',
        input_path: '$.detail',
      });
    });

    it('should create an event rule on a custom bus', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          bus: 'orders-bus',
          pattern: {
            source: 'orders.service',
          },
        })
        onOrder() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver({
        busName: 'orders-bus',
      });

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'onOrder-TestEvent',
        event_bus_name: '${aws_cloudwatch_event_bus.orders-bus-bus.name}',
      });
    });

    it('should create multiple event rules from one resource', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          pattern: {
            source: 'service.a',
          },
        })
        ruleA() {}

        @Rule({
          pattern: {
            source: 'service.b',
          },
        })
        ruleB() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'ruleA-TestEvent',
      });
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'ruleB-TestEvent',
      });
    });

    it('should create an event rule with detail type', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          pattern: {
            source: 'my.service',
            detailType: ['OrderCreated', 'OrderUpdated'],
          },
        })
        onOrder() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'onOrder-TestEvent',
        event_pattern:
          '${jsonencode({"source" = ["my.service"], "detail-type" = ["OrderCreated", "OrderUpdated"]})}',
      });
    });

    it('should create an event rule with retry policy', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          retryAttempts: 3,
          maxEventAge: 3600,
          pattern: {
            source: 'my.service',
          },
        })
        onEvent() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventTarget, {
        arn: 'test-function',
        input_path: '$.detail',
        retry_policy: {
          maximum_retry_attempts: 3,
          maximum_event_age_in_seconds: 3600,
        },
      });
    });

    it('should create an event rule with s3 integration', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          integration: 's3',
          pattern: {
            detailType: ['Object Created'],
            detail: {
              bucket: {
                name: ['my-bucket'],
              },
            },
          },
        })
        onS3Event() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'onS3Event-TestEvent',
        event_pattern:
          '${jsonencode({"source" = ["aws.s3"], "detail-type" = ["Object Created"], "detail" = {"bucket" = {"name" = ["my-bucket"]}}})}',
      });
    });

    it('should create an event rule with dynamodb integration', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          integration: 'dynamodb',
          pattern: {
            source: 'Users',
            detail: {
              eventName: ['INSERT'],
            },
          },
        })
        onDynamoEvent() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(CloudwatchEventRule, {
        name: 'onDynamoEvent-TestEvent',
        event_pattern:
          '${jsonencode({"source" = ["dynamodb.Users"], "detail-type" = ["db:stream"], "detail" = {"eventName" = ["INSERT"], "dynamodb" = {}}})}',
      });
    });

    it('should call LambdaHandler with correct config', async () => {
      @EventRule()
      class TestEvent {
        @Rule({
          pattern: {
            source: 'test.source',
          },
        })
        handler() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new EventRuleResolver();

      await resolver.beforeCreate(stack as unknown as AppStack);
      await resolver.create(module as unknown as AppModule, TestEvent);

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'handler-TestEvent',
        expect.objectContaining({
          name: 'handler',
          pattern: { source: 'test.source' },
          suffix: 'event',
          principal: 'events.amazonaws.com',
        })
      );
    });
  });
});
