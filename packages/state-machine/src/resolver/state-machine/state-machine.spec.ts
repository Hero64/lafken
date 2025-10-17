import 'cdktf/lib/testing/adapters/jest';
import {
  type ClassResource,
  enableBuildEnvVariable,
  getResourceMetadata,
} from '@alicanto/common';
import { type Role, setupTestingStack } from '@alicanto/resolver';
import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import { Testing } from 'cdktf';
import {
  Event,
  NestedStateMachine,
  Param,
  Payload,
  State,
  StateMachine,
} from '../../main';
import { StateMachine as StateMachineResource } from './state-machine';

jest.mock('@alicanto/resolver', () => {
  const actual = jest.requireActual('@alicanto/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockReturnValue({
        arn: 'test-function',
        functionName: 'test-function',
      }),
    })),
  };
});

const createStateMachine = async (classResource: ClassResource) => {
  const { stack } = setupTestingStack();

  const resource = new StateMachineResource(stack, 'testing', {
    classResource: classResource,
    resourceMetadata: getResourceMetadata(classResource),
    role: {
      arn: '',
    } as Role,
  });

  await resource.create();
  return {
    stack,
  };
};

describe('State Machine', () => {
  enableBuildEnvVariable();
  it('should create a simple state machine', async () => {
    @StateMachine({
      startAt: {
        type: 'wait',
        seconds: 2,
        next: {
          type: 'choice',
          choices: [
            {
              condition: '{% $foo = 1 %}',
              next: {
                type: 'succeed',
              },
            },
            {
              condition: '{% $foo = 2 %}',
              next: {
                type: 'fail',
                error: 'Error',
              },
            },
            {
              condition: '{% $foo = 3 %}',
              next: {
                type: 'pass',
                end: true,
              },
            },
          ],
          default: {
            type: 'pass',
            end: true,
          },
        },
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
      name: 'TestingSM',
      definition:
        '{"StartAt":"task1","States":{"task2":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","End":true,"Arguments":{"Payload":"{% $state.input.data %}","FunctionName":"test-function"}},"task1":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","Next":"task2","Arguments":{"Payload":{"executionId":"{% $states.context.Execution.Id %}"},"FunctionName":"test-function"},"Assign":{"foo":1}}},"QueryLanguage":"JSONata"}',
    });
  });

  it('should create a state machine with lambda functions', async () => {
    @Payload()
    class TestPayload {
      @Param({
        context: 'execution',
        source: 'id',
      })
      executionId: string;
    }

    @StateMachine({
      startAt: 'task1',
    })
    class TestingSM {
      @State({
        assign: {
          foo: 1,
        },
        next: 'task2',
      })
      task1(@Event(TestPayload) _e: TestPayload) {}

      @State({
        end: true,
      })
      task2(@Event(`{% $state.input.data %}`) _e: any) {}
    }

    const { stack } = await createStateMachine(TestingSM);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
      definition:
        '"StartAt":"task1","States":{"task2":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","End":true,"Arguments":{"Payload":"{% $state.input.data %}","FunctionName":"test-function"}},"task1":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","Next":"task2","Arguments":{"Payload":{},"FunctionName":"test-function"},"Assign":{"foo":1}}},"QueryLanguage":"JSONata"}',
      name: 'TestingSM',
    });
  });

  it('should crete a state machine with parallel state', async () => {
    @NestedStateMachine({
      startAt: {
        type: 'wait',
        seconds: 2,
        next: {
          type: 'succeed',
        },
      },
    })
    class Parallel1 {}

    @NestedStateMachine({
      startAt: {
        type: 'wait',
        seconds: 4,
        next: {
          type: 'succeed',
        },
      },
    })
    class Parallel2 {}

    @Payload()
    class TestPayload {
      @Param({
        context: 'execution',
        source: 'id',
      })
      executionId: string;
    }

    @StateMachine({
      startAt: {
        type: 'parallel',
        branches: [Parallel1, Parallel2],
        arguments: TestPayload,
        retry: [
          {
            errorEquals: ['States.ALL'],
            maxDelaySeconds: 2,
          },
        ],
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
      definition:
        '{"StartAt":"parallel-1","States":{"parallel-1":{"Type":"Parallel","Arguments":{"executionId":"{% $states.context.Execution.Id %}"},"Branches":[{"StartAt":"wait-1","States":{"succeed-1":{"Type":"Succeed"},"wait-1":{"Type":"Wait","Seconds":2,"Next":"succeed-1"}}},{"StartAt":"wait-1","States":{"succeed-1":{"Type":"Succeed"},"wait-1":{"Type":"Wait","Seconds":4,"Next":"succeed-1"}}}],"Retry":[{"ErrorEquals":["States.ALL"],"MaxDelaySeconds":2}]}},"QueryLanguage":"JSONata"}',
    });
  });

  it('should create a state machine with distributed map', async () => {
    @NestedStateMachine({
      startAt: {
        type: 'wait',
        seconds: 2,
        next: {
          type: 'succeed',
        },
      },
    })
    class MapState {}

    @StateMachine({
      startAt: {
        type: 'map',
        mode: 'distributed',
        executionType: 'express',
        states: MapState,
        retry: [
          {
            errorEquals: ['States.ALL'],
            maxDelaySeconds: 2,
          },
        ],
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
      definition:
        '{"StartAt":"map-1","States":{"map-1":{"Type":"Map","ItemProcessor":{"StartAt":"wait-1","States":{"succeed-1":{"Type":"Succeed"},"wait-1":{"Type":"Wait","Seconds":2,"Next":"succeed-1"}},"ProcessorConfig":{"Mode":"DISTRIBUTED","ExecutionType":"EXPRESS"}},"Retry":[{"ErrorEquals":["States.ALL"],"MaxDelaySeconds":2}]}},"QueryLanguage":"JSONata"}',
    });
  });
});
