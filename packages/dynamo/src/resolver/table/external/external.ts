import { DataAwsDynamodbTable } from '@cdktn/provider-aws/lib/data-aws-dynamodb-table';
import { lafkenResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ExternalTableMetadata } from '../../../main';

export class ExternalTable extends lafkenResource.make(DataAwsDynamodbTable) {
  constructor(scope: Construct, props: ExternalTableMetadata) {
    const { name } = props;

    super(scope, `${name}-table`, {
      name,
    });

    if (props.ref) {
      this.register('dynamo', props.ref);
    }
  }
}
