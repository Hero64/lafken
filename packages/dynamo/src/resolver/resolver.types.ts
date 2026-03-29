import type { DataAwsDynamodbTable } from '@cdktn/provider-aws/lib/data-aws-dynamodb-table';
import type { DynamodbTable } from '@cdktn/provider-aws/lib/dynamodb-table';
import type { ClassResource } from '@lafken/common';
import type { AppStack } from '@lafken/resolver';

interface ExtendProps {
  scope: AppStack;
  table: DynamodbTable | DataAwsDynamodbTable;
}

export interface ClassResourceExtends {
  table: ClassResource;
  extends: (props: ExtendProps) => void;
}
