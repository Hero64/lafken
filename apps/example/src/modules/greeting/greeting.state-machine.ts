import {
  Event,
  NestedStateMachine,
  State,
  StateMachine,
} from '@alicanto/state-machine/main';
import { StateMachinePayload } from './greeting.field';

@NestedStateMachine({
  startAt: 'log',
})
class MapState {
  @State({
    end: true,
  })
  log(@Event('{% { "index": $states.input } %}') index: { index: number }) {
    console.log('Hello', index);

    return index.index * 2;
  }
}

@NestedStateMachine({
  startAt: 'log',
})
class Branch1 {
  @State({
    end: true,
  })
  log() {
    console.log('Hello from branch 1');
  }
}

@NestedStateMachine({
  startAt: 'log',
})
class Branch2 {
  @State({
    end: true,
  })
  log() {
    console.log('hello from branch 2');
  }
}

@StateMachine({
  startAt: {
    type: 'wait',
    seconds: 1,
    next: 'sayHello',
  },
  minify: false,
})
export class GreetingStepFunction {
  @State({
    next: {
      type: 'choice',
      default: {
        type: 'pass',
        end: true,
      },
      choices: [
        {
          condition:
            '{% $states.context.Execution.Input.type = "map" and $count($states.input.list) > 0  %}',
          next: {
            type: 'map',
            mode: 'inline',
            items: '{% $states.input.list %}',
            states: MapState,
          },
        },
        {
          condition: '{% $states.context.Execution.Input.type = "parallel" %}',
          next: {
            type: 'parallel',
            branches: [Branch1, Branch2],
          },
        },
        {
          condition: '{% $states.context.Execution.Input.type = "success" %}',
          next: {
            type: 'succeed',
            output: {
              one: '{% $states.context.Execution.Input.list[0] %}',
              foo: {
                bar: '{% $states.context.Execution.Input.type %}',
              },
            },
          },
        },
        {
          condition: '{% $states.context.Execution.Input.type = "fail" %}',
          next: {
            type: 'fail',
            error: 'Fail execution',
          },
        },
        {
          condition: '{% $states.context.Execution.Input.type = "distributed" %}',
          next: {
            type: 'map',
            mode: 'distributed',
            states: MapState,
            itemReader: {
              bucket: 'alicanto-example-documents',
              source: 'json',
              key: 'list.json',
            },
            resultWriter: {
              bucket: 'alicanto-example-documents',
              prefix: 'result',
              config: {
                outputType: 'JSON',
                transformation: 'COMPACT',
              },
            },
          },
        },
      ],
    },
  })
  sayHello(@Event(StateMachinePayload) e: StateMachinePayload) {
    console.log('Hello');

    console.log(e);

    return e;
  }
}
