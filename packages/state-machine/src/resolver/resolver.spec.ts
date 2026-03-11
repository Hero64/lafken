import { SfnStateMachine } from '@cdktn/provider-aws/lib/sfn-state-machine';
import { enableBuildEnvVariable } from '@lafken/common';
import {
  type AppModule,
  LambdaHandler,
  lafkenResource,
  setupTestingStackWithModule,
} from '@lafken/resolver';
import { Testing } from 'cdktn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Event, NestedStateMachine, Param, Payload, State, StateMachine } from '../main';
import { StateMachineResolver } from './resolver';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();

  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
      this.functionName = 'test-function';
    }),
  };
});

describe('state-machine resolver', () => {
  beforeEach(() => {
    lafkenResource.reset();
    vi.mocked(LambdaHandler).mockClear();
  });
  enableBuildEnvVariable();

  describe('create', () => {
    it('should create a simple state machine', async () => {
      @StateMachine({
        startAt: {
          type: 'wait',
          seconds: 5,
          next: {
            type: 'succeed',
          },
        },
      })
      class TestSM {}

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
      });
    });

    it('should create a state machine with lambda tasks', async () => {
      @StateMachine({
        startAt: 'step1',
      })
      class TestSM {
        @State({
          next: {
            type: 'succeed',
          },
        })
        step1() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
      });

      expect(LambdaHandler).toHaveBeenCalledWith(
        expect.anything(),
        'step1-TestSM',
        expect.objectContaining({
          name: 'step1',
          suffix: 'states',
        })
      );
    });

    it('should create a state machine with multiple lambda tasks', async () => {
      @StateMachine({
        startAt: 'taskA',
      })
      class TestSM {
        @State({ next: 'taskB' })
        taskA() {}

        @State({ end: true })
        taskB() {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
      });

      expect(LambdaHandler).toHaveBeenCalledTimes(2);
    });

    it('should create a state machine with choice state', async () => {
      @StateMachine({
        startAt: {
          type: 'choice',
          choices: [
            {
              condition: '{% $foo = 1 %}',
              next: { type: 'succeed' },
            },
          ],
          default: { type: 'fail', error: 'NoMatch' },
        },
      })
      class TestSM {}

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
        definition:
          '{"StartAt":"choice","States":{"succeed":{"Type":"Succeed"},"fail":{"Type":"Fail","Error":"NoMatch"},"choice":{"Type":"Choice","Choices":[{"Condition":"{% $foo = 1 %}","Next":"succeed"}],"Default":"fail"}},"QueryLanguage":"JSONata"}',
      });
    });

    it('should create a state machine with parallel branches', async () => {
      @NestedStateMachine({
        startAt: {
          type: 'wait',
          seconds: 1,
          next: { type: 'succeed' },
        },
      })
      class Branch1 {}

      @NestedStateMachine({
        startAt: {
          type: 'wait',
          seconds: 2,
          next: { type: 'succeed' },
        },
      })
      class Branch2 {}

      @StateMachine({
        startAt: {
          type: 'parallel',
          branches: [Branch1, Branch2],
        },
      })
      class TestSM {}

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
        definition:
          '{"StartAt":"parallel","States":{"parallel":{"Type":"Parallel","End":true,"Branches":[{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"wait":{"Type":"Wait","Seconds":1,"Next":"succeed"}}},{"StartAt":"wait-2","States":{"succeed-2":{"Type":"Succeed"},"wait-2":{"Type":"Wait","Seconds":2,"Next":"succeed-2"}}}]}},"QueryLanguage":"JSONata"}',
      });
    });

    it('should create a state machine with event payload', async () => {
      @Payload()
      class TestPayload {
        @Param({
          context: 'execution',
          source: 'id',
        })
        executionId: string;
      }

      @StateMachine({
        startAt: 'task',
      })
      class TestSM {
        @State({ end: true })
        task(@Event(TestPayload) _e: TestPayload) {}
      }

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
        definition:
          '{"StartAt":"task","States":{"task":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","Arguments":{"Payload":{"executionId":"{% $states.context.Execution.Id %}"},"FunctionName":"test-function"},"End":true,"Output":"{% $exists($states.result.Payload) ? $states.result.Payload : {} %}"}},"QueryLanguage":"JSONata"}',
      });
    });

    it('should create a state machine with distributed map', async () => {
      @NestedStateMachine({
        startAt: {
          type: 'wait',
          seconds: 2,
          next: { type: 'succeed' },
        },
      })
      class MapState {}

      @StateMachine({
        startAt: {
          type: 'map',
          mode: 'distributed',
          executionType: 'express',
          states: MapState,
        },
      })
      class TestSM {}

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
        definition:
          '{"StartAt":"map","States":{"map":{"Type":"Map","ItemProcessor":{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"wait":{"Type":"Wait","Seconds":2,"Next":"succeed"}},"ProcessorConfig":{"Mode":"DISTRIBUTED","ExecutionType":"EXPRESS"}},"End":true}},"QueryLanguage":"JSONata"}',
      });
    });

    it('should create a state machine with execution type', async () => {
      @StateMachine({
        executionType: 'EXPRESS',
        startAt: {
          type: 'wait',
          seconds: 1,
          next: { type: 'succeed' },
        },
      })
      class TestSM {}

      const { stack, module } = setupTestingStackWithModule();
      const resolver = new StateMachineResolver();

      await resolver.create(module as unknown as AppModule, TestSM);

      const synthesized = Testing.synth(stack);
      expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
        name: 'TestSM',
        definition:
          '{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"wait":{"Type":"Wait","Seconds":1,"Next":"succeed"}},"QueryLanguage":"JSONata","ExecutionType":"EXPRESS"}',
      });
    });
  });
});
