import { alicantoResource } from '@alicanto/resolver';
import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import { Construct } from 'constructs';
import { Schema } from './schema/schema';
import type { StateMachineProps } from './state-machine.types';

export class StateMachine extends Construct {
  constructor(
    stack: Construct,
    id: string,
    private props: StateMachineProps
  ) {
    super(stack, id);
  }

  public async create() {
    const { resourceMetadata, classResource, role } = this.props;

    const schema = new Schema(this, classResource);
    const definition = await schema.create();
    const stateMachine = alicantoResource.create(
      resourceMetadata.name,
      SfnStateMachine,
      this,
      'state-machine',
      {
        name: resourceMetadata.name,
        roleArn: role.arn,
        definition: JSON.stringify({
          ...definition,
          QueryLanguage: 'JSONata',
          ExecutionType: resourceMetadata.executionType?.toUpperCase(),
        }),
      }
    );

    stateMachine.isGlobal();
  }
}
