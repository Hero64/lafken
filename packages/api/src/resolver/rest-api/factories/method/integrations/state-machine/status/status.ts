import type { StateMachineStatusIntegrationResponse } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { StateMachineBaseIntegration } from '../base/base';

export class StatusIntegration
  extends StateMachineBaseIntegration<StateMachineStatusIntegrationResponse>
  implements Integration
{
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'DescribeExecution',
      roleArn: props.integrationHelper.createRole('state_machine.read', props.restApi)
        .arn,
      successResponse: {
        field: {
          type: 'Object',
          destinationName: 'StatusStateMachineResponse',
          name: 'StatusStateMachineResponse',
          properties: [
            {
              destinationName: 'status',
              name: 'status',
              type: 'String',
              validation: {
                required: true,
              },
            },
          ],
          payload: {
            id: 'StatusStateMachineResponse',
            name: 'StatusStateMachineResponse',
          },
          validation: {},
        },
        template: `#set($status = $input.json('status')) { "status": "$status" }`,
      },
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
