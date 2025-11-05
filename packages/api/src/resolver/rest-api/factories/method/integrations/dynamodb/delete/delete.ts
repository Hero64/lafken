import type { DynamoDeleteIntegrationResponse } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { DynamoBaseIntegration } from '../base/base';

export class DeleteIntegration
  extends DynamoBaseIntegration<DynamoDeleteIntegrationResponse>
  implements Integration
{
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'DeleteItem',
      roleArn: props.integrationHelper.createRole('dynamodb.delete', props.restApi).arn,
      createTemplate: (integrationResponse) => {
        const tableResolver = props.proxyHelper.resolveProxyValue(
          integrationResponse.tableName,
          props.paramHelper.pathParams
        );

        const partitionKeyResolver = props.proxyHelper.resolveObjectKeyValue(
          integrationResponse.partitionKey,
          props.paramHelper.pathParams
        );

        const updateKey = {
          [partitionKeyResolver.key]: partitionKeyResolver.value,
        };

        if (integrationResponse.sortKey) {
          const sortKeyResolver = props.proxyHelper.resolveObjectKeyValue(
            integrationResponse.sortKey,
            props.paramHelper.pathParams
          );
          updateKey[sortKeyResolver.key] = sortKeyResolver.value;
        }

        const tableTemplate = `"TableName": ${props.templateHelper.getTemplateFromProxyValue(tableResolver)},`;
        const keyTemplate = `"Key": ${this.resolveItemTemplate(updateKey)}`;

        return `{${tableTemplate}${keyTemplate}}`;
      },
    });
  }
}
