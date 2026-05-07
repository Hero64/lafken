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
      service: {
        type: 'state_machine',
        permissions: ['DescribeExecution'],
      },
      createTemplate: (integrationResponse) => {
        const executionArn = this.getResponseValue(integrationResponse.executionArn, '');
        return `{ "executionArn": "${executionArn}" }`;
      },
    });
  }
}
