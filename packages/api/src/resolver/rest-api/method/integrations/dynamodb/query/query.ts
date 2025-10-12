import type {
  ApiObjectParam,
  ApiParamMetadata,
  DynamoQueryIntegrationResponse,
} from '../../../../../../main';
import type { ProxyResolveObjectKeyValue } from '../../../helpers/proxy/proxy.types';
import type { TemplateParam } from '../../../helpers/template/template.types';
import type { Integration, IntegrationProps } from '../../integration.types';
import { DynamoBaseIntegration } from '../base/base';

export class QueryIntegration
  extends DynamoBaseIntegration<DynamoQueryIntegrationResponse>
  implements Integration
{
  protected condition = '';
  protected attributeValues: ApiObjectParam = {
    type: 'Object',
    destinationName: 'query',
    name: 'query',
    payload: {
      id: 'query',
      name: 'query',
    },
    properties: [],
    source: 'body',
    validation: {},
  };
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'Query',
      roleArn: props.integrationHelper.createRole('dynamodb.read', props.restApi).arn,
      createTemplate: (integrationResponse) => {
        this.resolveKeyCondition(
          ':partitionKey',
          props.proxyHelper.resolveObjectKeyValue(
            integrationResponse.partitionKey,
            props.paramHelper.pathParams
          )
        );
        if (integrationResponse.sortKey) {
          this.resolveKeyCondition(
            ':sortKey',
            props.proxyHelper.resolveObjectKeyValue(
              integrationResponse.sortKey,
              props.paramHelper.pathParams
            ),
            '&&'
          );
        }

        let index = '';
        if (integrationResponse.indexName) {
          const indexResolver = props.proxyHelper.resolveProxyValue(
            integrationResponse.tableName,
            props.paramHelper.pathParams
          );

          index = `"Index": ${props.templateHelper.getTemplateFromProxyValue(indexResolver)}`;
        }

        const tableResolver = props.proxyHelper.resolveProxyValue(
          integrationResponse.tableName,
          props.paramHelper.pathParams
        );

        const tableTemplate = `"TableName": ${props.templateHelper.getTemplateFromProxyValue(tableResolver)},`;
        const keyConditionTemplate = `"KeyConditionExpression": "${this.condition.trim()}",`;
        const expressionTemplate = `"ExpressionAttributeValues": ${this.getAttributeValueExpression()}`;
        const indexTemplate = `${index ? `,${index}` : ''}`;
        return `{${tableTemplate}${keyConditionTemplate}${expressionTemplate}${indexTemplate}}`;
      },
    });
  }

  protected getAttributeValueExpression() {
    const { templateHelper } = this.props;
    const valueExpression = templateHelper.generateTemplate({
      field: this.attributeValues,
      propertyWrapper: (template, field) => this.marshallField(template, field.type),
      valueParser: (value, fieldType) => {
        return fieldType === 'String' ? value : `"${value}"`;
      },
    });

    return valueExpression;
  }

  protected attributeToParam(
    name: string,
    {
      type = 'Object',
      source = 'body',
      validation = {
        required: true,
      },
      ...rest
    }: Partial<Omit<TemplateParam, 'destinationName'>>
  ) {
    return {
      name,
      validation,
      type,
      source,
      ...rest,
      destinationName: name,
    } as ApiParamMetadata;
  }

  private resolveKeyCondition(
    keyValue: string,
    resolver: ProxyResolveObjectKeyValue,
    union: '&&' | '||' | '' = ''
  ) {
    const { templateHelper } = this.props;
    const field: ApiParamMetadata = this.attributeToParam(keyValue, {
      ...(resolver.field || {}),
      type: resolver.type,
      name: resolver.path,
      directTemplateValue: resolver.field ? undefined : resolver.value,
    });

    let template = `${union} ${resolver.key} = ${keyValue}`;

    if (resolver.field) {
      template = templateHelper.validateTemplateArgument(
        resolver.path.split('.'),
        field,
        template,
        true
      );
    }

    this.condition += ` ${template}`;
    this.attributeValues.properties.push(field);
  }
}
