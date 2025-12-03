import { LambdaHandler } from '@alicanto/resolver';
import type {
  ExecutionSource,
  StateMachineSource,
  StateSource,
  TaskSource,
} from '../../../main';

export const mapSourceExecution: Record<ExecutionSource, string> = {
  id: 'Id',
  name: 'Name',
  role_arn: 'RoleArn',
  redrive_count: 'RedriveCount',
  redrive_time: 'RedriveTime',
  start_time: 'StartTime',
};

export const mapSourceStateMachine: Record<StateMachineSource, string> = {
  id: 'Id',
  name: 'Name',
};

export const mapSourceState: Record<StateSource, string> = {
  entered_time: 'EnteredTime',
  retry_count: 'Name',
  name: 'Name',
};

export const mapSourceTask: Record<TaskSource, string> = {
  token: 'Token',
};

export class StateNames {
  private nameCount: Record<string, number> = {};

  createName(name: string) {
    this.nameCount[name] ??= 0;
    this.nameCount[name]++;

    if (this.nameCount[name] === 1) {
      return name;
    }
    return `${name}-${this.nameCount[name]}`;
  }
}

export class LambdaStates {
  private lambdas: Record<string, LambdaHandler> = {};

  createLambda([scope, id, props]: ConstructorParameters<typeof LambdaHandler>) {
    if (this.lambdas[id]) {
      return this.lambdas[id];
    }

    const lambda = new LambdaHandler(scope, id, props);
    this.lambdas[id] = lambda;

    return lambda;
  }
}
