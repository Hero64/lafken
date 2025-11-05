import type { DynamoPutIntegrationResponse } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { DynamoBaseIntegration } from '../base/base';

export class PutIntegration
  extends DynamoBaseIntegration<DynamoPutIntegrationResponse>
  implements Integration
{
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'PutItem',
      roleArn: props.integrationHelper.createRole('dynamodb.write', props.restApi).arn,
      createTemplate: (integrationResponse) => {
        const tableResolver = props.proxyHelper.resolveProxyValue(
          integrationResponse.tableName,
          props.paramHelper.pathParams
        );

        const conditionResolver = this.resolveConditionTemplate(
          integrationResponse.validateExistKeys
        );

        let conditionTemplate = '';

        if (conditionResolver) {
          conditionTemplate = `,"ConditionExpression": ${conditionResolver}`;
        }

        const tableTemplate = `"TableName": ${props.templateHelper.getTemplateFromProxyValue(tableResolver)}`;
        const itemTemplate = `,"Item": ${this.resolveItemTemplate(integrationResponse.data)}`;

        return `{${tableTemplate}${itemTemplate}${conditionTemplate}}`;
      },
    });
  }

  private resolveConditionTemplate(values: any[] = []) {
    if (!Array.isArray(values)) {
      throw new Error('Condition only support an string array value');
    }

    if (values.length === 0) {
      return '';
    }

    const hasInvalidValues = values.some((value) => typeof value !== 'string');

    if (hasInvalidValues) {
      throw new Error('Condition only support string values');
    }

    let condition = `attribute_exists(${values[0]})`;

    if (values[1]) {
      condition += ` and attribute_exists(${values[1]})`;
    }

    return condition;
  }
}
