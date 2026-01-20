import 'cdktf/lib/testing/adapters/jest';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import { SqsQueue } from '@cdktf/provider-aws/lib/sqs-queue';
import {
  type ClassResource,
  enableBuildEnvVariable,
  type GetResourceProps,
  getResourceMetadata,
} from '@lafkn/common';
import { lafknResource, setupTestingStackWithModule } from '@lafkn/resolver';
import { Testing } from 'cdktf';
import {
  Event,
  IntegrationOptions,
  NestedStateMachine,
  Param,
  Payload,
  State,
  StateMachine,
} from '../../main';
import { StateMachine as StateMachineResource } from './state-machine';

jest.mock('@lafkn/resolver', () => {
  const actual = jest.requireActual('@lafkn/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      functionName: 'test-function',
    })),
  };
});

const createStateMachine = async (classResource: ClassResource) => {
  const { stack, module } = setupTestingStackWithModule();

  const stateMachine = new StateMachineResource(module, 'testing', {
    classResource: classResource,
    resourceMetadata: getResourceMetadata(classResource),
    moduleName: 'testing',
  });

  stateMachine.attachDefinition();

  return {
    stack,
    stateMachine,
  };
};

describe('State Machine', () => {
  beforeEach(() => {
    lafknResource.reset();
  });
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
        '{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"fail":{"Type":"Fail","Error":"Error"},"pass":{"Type":"Pass","End":true},"pass-2":{"Type":"Pass","End":true},"choice":{"Type":"Choice","Choices":[{"Condition":"{% $foo = 1 %}","Next":"succeed"},{"Condition":"{% $foo = 2 %}","Next":"fail"},{"Condition":"{% $foo = 3 %}","Next":"pass"}],"Default":"pass-2"},"wait":{"Type":"Wait","Seconds":2,"Next":"choice"}},"QueryLanguage":"JSONata"}',
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
        '{"StartAt":"task1","States":{"task2":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","Arguments":{"Payload":"{% $state.input.data %}","FunctionName":"test-function"},"End":true,"Output":"{% $exist($states.result.Payload) ? $states.result.Payload) : {} %}"},"task1":{"Type":"Task","Resource":"arn:aws:states:::lambda:invoke","Arguments":{"Payload":{"executionId":"{% $states.context.Execution.Id %}"},"FunctionName":"test-function"},"Next":"task2","Assign":{"foo":1},"Output":"{% $exist($states.result.Payload) ? $states.result.Payload) : {} %}"}},"QueryLanguage":"JSONata"}',
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
        '{"StartAt":"parallel","States":{"parallel":{"Type":"Parallel","Arguments":{"executionId":"{% $states.context.Execution.Id %}"},"End":true,"Branches":[{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"wait":{"Type":"Wait","Seconds":2,"Next":"succeed"}}},{"StartAt":"wait-2","States":{"succeed-2":{"Type":"Succeed"},"wait-2":{"Type":"Wait","Seconds":4,"Next":"succeed-2"}}}],"Retry":[{"ErrorEquals":["States.ALL"],"MaxDelaySeconds":2}]}},"QueryLanguage":"JSONata"}',
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
        '{"StartAt":"map","States":{"map":{"Type":"Map","ItemProcessor":{"StartAt":"wait","States":{"succeed":{"Type":"Succeed"},"wait":{"Type":"Wait","Seconds":2,"Next":"succeed"}},"ProcessorConfig":{"Mode":"DISTRIBUTED","ExecutionType":"EXPRESS"}},"End":true,"Retry":[{"ErrorEquals":["States.ALL"],"MaxDelaySeconds":2}]}},"QueryLanguage":"JSONata"}',
    });
  });

  it('should create state machine with integration', async () => {
    @StateMachine({
      startAt: 'integration',
    })
    class TestingSM {
      @State({
        integrationService: 'sqs',
        action: 'sendMessage',
        mode: 'token',
      })
      integration(@IntegrationOptions() { getResourceValue }: GetResourceProps) {
        return {
          QueueUrl: getResourceValue('queue::test', 'id'),
          MessageBody: {
            Message: 'test',
            TaskToken: '{% $states.context.Task.Token %}',
          },
        };
      }
    }
    const { stack } = await createStateMachine(TestingSM);

    const Queue = lafknResource.make(SqsQueue);

    const queue = new Queue(stack, 'test');
    queue.isGlobal('queue', 'test');

    await lafknResource.callDependentCallbacks();

    const synthesized = Testing.synth(stack);
    expect(synthesized).toHaveResourceWithProperties(SfnStateMachine, {
      definition:
        '{"StartAt":"integration","States":{"integration":{"Type":"Task","Resource":"arn:aws:states:::sqs:sendMessage.waitForTaskToken","Arguments":{"QueueUrl":"${aws_sqs_queue.test.id}","MessageBody":{"Message":"test","TaskToken":"{% $states.context.Task.Token %}"}},"Output":"{% $exist($states.result.Payload) ? $states.result.Payload) : {} %}"}},"QueryLanguage":"JSONata"}',
      name: 'TestingSM',
    });
  });

  it('should throw when has unresolved dependencies', async () => {
    @StateMachine({
      startAt: 'integration',
    })
    class TestingSM {
      @State({
        integrationService: 'sqs',
        action: 'sendMessage',
        mode: 'token',
      })
      integration(@IntegrationOptions() { getResourceValue }: GetResourceProps) {
        return {
          QueueUrl: getResourceValue('queue::test', 'id'),
          MessageBody: {
            Message: 'test',
            TaskToken: '{% $states.context.Task.Token %}',
          },
        };
      }
    }

    await createStateMachine(TestingSM);

    expect(lafknResource.callDependentCallbacks()).rejects.toThrow(
      'The schema has a unresolved dependency'
    );
  });

  it('should create a simple state machine role', async () => {
    @StateMachine({
      startAt: {
        type: 'wait',
        seconds: 10,
        next: {
          type: 'succeed',
        },
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogDelivery", "logs:GetLogDelivery", "logs:UpdateLogDelivery", "logs:DeleteLogDelivery", "logs:ListLogDeliveries", "logs:PutResourcePolicy", "logs:DescribeResourcePolicies", "logs:DescribeLogGroups"], "Resource" = "*"}, {"Effect" = "Allow", "Action" = ["lambda:InvokeFunction"], "Resource" = "*"}]})}',
    });
  });

  it('should add bucket permissions to state machine role', async () => {
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
        states: MapState,
        itemReader: {
          bucket: 'testing',
          key: 'test.json',
          source: 'json',
        },
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogDelivery", "logs:GetLogDelivery", "logs:UpdateLogDelivery", "logs:DeleteLogDelivery", "logs:ListLogDeliveries", "logs:PutResourcePolicy", "logs:DescribeResourcePolicies", "logs:DescribeLogGroups"], "Resource" = "*"}, {"Effect" = "Allow", "Action" = ["lambda:InvokeFunction"], "Resource" = "*"}, {"Effect" = "Allow", "Action" = ["s3:GetObject", "s3:ListBucket"], "Resource" = ["arn:aws:s3:::testing", "arn:aws:s3:::testing/*"]}]})}',
    });
  });

  it('should include custom services to state machine role', async () => {
    @StateMachine({
      services: ({ getResourceValue }) => [
        {
          type: 'sqs',
          permissions: ['GetQueueUrl', 'ReceiveMessage'],
          resources: [getResourceValue('queue::test', 'id')],
        },
      ],
      startAt: {
        type: 'wait',
        seconds: 10,
        next: {
          type: 'succeed',
        },
      },
    })
    class TestingSM {}

    const { stack } = await createStateMachine(TestingSM);
    const Queue = lafknResource.make(SqsQueue);

    const queue = new Queue(stack, 'test');
    queue.isGlobal('queue', 'test');

    await lafknResource.callDependentCallbacks();
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(IamRolePolicy, {
      policy:
        '${jsonencode({"Version" = "2012-10-17", "Statement" = [{"Effect" = "Allow", "Action" = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogDelivery", "logs:GetLogDelivery", "logs:UpdateLogDelivery", "logs:DeleteLogDelivery", "logs:ListLogDeliveries", "logs:PutResourcePolicy", "logs:DescribeResourcePolicies", "logs:DescribeLogGroups"], "Resource" = "*"}, {"Effect" = "Allow", "Action" = ["lambda:InvokeFunction"], "Resource" = "*"}, {"Effect" = "Allow", "Action" = ["sqs:GetQueueUrl", "sqs:ReceiveMessage"], "Resource" = [aws_sqs_queue.test.id]}]})}',
    });
  });
});
