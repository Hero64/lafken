import type { StateMachineStatusIntegrationResponse } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { StateMachineBaseIntegration } from '../base/base';

export class StopIntegration
  extends StateMachineBaseIntegration<StateMachineStatusIntegrationResponse>
  implements Integration
{
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'StopExecution',
      roleArn: props.integrationHelper.createRole('state_machine.delete', props.restApi)
        .arn,
      successResponse: {},
      createTemplate: (integrationResponse) => {
        const stateMachine = this.getResponseValue(
          integrationResponse.stateMachineArn,
          ''
        );
        const executionId = this.getResponseValue(integrationResponse.executionId, '');
        return `{ "executionArn": "${stateMachine}:${executionId}" }`;
      },
    });
  }
}
