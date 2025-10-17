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
