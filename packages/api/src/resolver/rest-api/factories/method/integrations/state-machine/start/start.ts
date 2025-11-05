import { cleanTemplateString } from '@alicanto/common';
import type { StateMachineStartIntegrationResponse } from '../../../../../../../main';
import type { Integration, IntegrationProps } from '../../integration.types';
import { StateMachineBaseIntegration } from '../base/base';

export class StartIntegration
  extends StateMachineBaseIntegration<StateMachineStartIntegrationResponse>
  implements Integration
{
  constructor(props: IntegrationProps) {
    super({
      ...props,
      action: 'StartExecution',
      roleArn: props.integrationHelper.createRole('state_machine.write', props.restApi)
        .arn,
      successResponse: {
        field: {
          type: 'Object',
          destinationName: 'StartStateMachineResponse',
          name: 'StartStateMachineResponse',
          properties: [
            {
              destinationName: 'startDate',
              name: 'startDate',
              type: 'String',
              validation: {
                required: true,
              },
            },
            {
              destinationName: 'executionId',
              name: 'executionId',
              type: 'String',
              validation: {
                required: true,
              },
            },
          ],
          payload: {
            id: 'StartStateMachineResponse',
            name: 'StartStateMachineResponse',
          },
          validation: {},
        },
        template: cleanTemplateString(`#set($startDate = $input.path('$.startDate'))
          #set($executionArn = $input.path('$.executionArn'))
          #set($executionId = $executionArn.split(':')[6])
          #set($id = $executionId.split('/')[1])
          {
            "startDate": "$startDate",
            "executionId": "$id"
          }`),
      },
      createTemplate: (integrationResponse) => {
        const { templateHelper, proxyHelper, paramHelper } = props;
        const input = templateHelper.generateTemplateByObject({
          value: integrationResponse.input,
          quoteType: '\\"',
          resolveValue: (value) =>
            proxyHelper.resolveProxyValue(value, paramHelper.pathParams),
          parseObjectValue: (value, fieldType, _isRoot, isField) => {
            return isField || fieldType !== 'String'
              ? value
              : fieldType !== 'String'
                ? value
                : `\\"${props.templateHelper.scapeJavascriptValue(value.replaceAll('\\"', "'"), fieldType)}\\"`;
          },
          templateOptions: {
            valueParser: (value, fieldType) => {
              const template =
                fieldType === 'String' ? value.replaceAll('\\"', '') : value;
              return props.templateHelper.scapeJavascriptValue(template, fieldType);
            },
          },
        });

        const inputTemplate = `"input": "${input}",`;
        const stateMachineArnTemplate = `"stateMachineArn": ${this.getResponseValue(integrationResponse.stateMachineArn)}`;
        return `{${inputTemplate}${stateMachineArnTemplate}}`;
      },
    });
  }
}
