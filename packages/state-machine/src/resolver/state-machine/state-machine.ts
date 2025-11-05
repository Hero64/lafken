import { type AppModule, alicantoResource } from '@alicanto/resolver';
import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import { Schema } from './schema/schema';
import type { StateMachineProps } from './state-machine.types';

export class StateMachine extends alicantoResource.make(SfnStateMachine) {
  constructor(scope: AppModule, id: string, props: StateMachineProps) {
    const { resourceMetadata, role, classResource } = props;

    const schema = new Schema(scope, classResource);
    const definition = schema.getDefinition();

    super(scope, `${id}-state-machine`, {
      name: resourceMetadata.name,
      roleArn: role.arn,
      definition: JSON.stringify({
        ...definition,
        QueryLanguage: 'JSONata',
        ExecutionType: resourceMetadata.executionType?.toUpperCase(),
      }),
    });

    this.isGlobal(scope.id);
  }
}
