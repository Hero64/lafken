import {
  Api,
  Delete,
  Event,
  Get,
  IntegrationOptions,
  Post,
  type StateMachineIntegrationOption,
  type StateMachineStartIntegrationResponse,
  type StateMachineStatusIntegrationResponse,
  type StateMachineStopIntegrationResponse,
} from '@alicanto/api/main';
import { StateMachineExecutionId, StateMachineInput } from './greeting.field';

@Api({
  path: 'state-machine',
})
export class StateMachineIntegration {
  @Post({
    integration: 'state-machine',
    action: 'Start',
  })
  get(
    @Event(StateMachineInput) e: StateMachineInput,
    @IntegrationOptions() { getResourceValue }: StateMachineIntegrationOption
  ): StateMachineStartIntegrationResponse {
    return {
      stateMachineArn: getResourceValue('greeting::GreetingStepFunction', 'id'),
      input: e,
    };
  }

  @Get({
    integration: 'state-machine',
    action: 'Status',
    path: '/{id}',
  })
  status(
    @Event(StateMachineExecutionId) e: StateMachineExecutionId
  ): StateMachineStatusIntegrationResponse {
    return {
      executionArn: e.id,
    };
  }

  @Delete({
    integration: 'state-machine',
    action: 'Stop',
    path: '/{id}',
  })
  stop(
    @Event(StateMachineExecutionId) e: StateMachineExecutionId
  ): StateMachineStopIntegrationResponse {
    return {
      executionArn: e.id,
    };
  }
}
