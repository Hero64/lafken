import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import { Handler, Standalone } from '@lafken/standalone/main';

const client = new SchedulerClient();

@Standalone()
export class StandalonePokemonHandler {
  @Handler({
    invocatorService: 'scheduler.amazonaws.com',
    name: 'callPokemon',
  })
  callPokemon() {
    console.log('Here');
  }

  @Handler({
    lambda: {
      env: ({ getResourceValue }) => {
        return {
          lambda: getResourceValue('pokemon-module::handler::callPokemon', 'arn'),
          executionRole: getResourceValue(
            'pokemon-module::handler::role::callPokemon',
            'arn'
          ),
        };
      },
      services: [
        {
          type: 'custom',
          serviceName: 'scheduler',
          permissions: ['CreateSchedule'],
        },
        {
          type: 'custom',
          serviceName: 'iam',
          permissions: ['PassRole'],
        },
      ],
    },
  })
  async invoke() {
    const command = new CreateScheduleCommand({
      Name: 'my-one-time-schedule',
      ScheduleExpression: 'at(2025-12-01T10:00:00)', // ISO 8601 UTC
      FlexibleTimeWindow: { Mode: 'OFF' },
      ActionAfterCompletion: 'DELETE', // elimina el schedule al terminar
      Target: {
        Arn: process.env.lambda,
        RoleArn: process.env.executionRole,
        Input: JSON.stringify({ key: 'value' }),
      },
    });

    await client.send(command);
  }
}
