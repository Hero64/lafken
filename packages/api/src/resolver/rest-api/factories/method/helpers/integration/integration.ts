import { Role } from '@lafken/resolver';
import type { ResponseArrayField, ResponseObjectMetadata } from '../../../../../../main';
import type { ResponseHandler } from '../response/response.types';
import type { ResponseTemplateHelper } from '../response-template/response-template';
import type { CreateRoleProps } from './integration.types';

export class IntegrationHelper {
  public createRole(props: CreateRoleProps) {
    const { name, scope, service, additionalServices = [] } = props;

    const role = new Role(scope, `${name}-role`, {
      name: `${name}-integration`,
      principal: 'apigateway.amazonaws.com',
      services: [service, ...additionalServices],
    });

    return role;
  }

  public generateResponseTemplate(
    handlerResponse: ResponseHandler[],
    responseTemplateHelper: ResponseTemplateHelper
  ) {
    return handlerResponse.map((response) => {
      return {
        ...response,
        template:
          !response.template &&
          (response.field?.type === 'Object' || response.field?.type === 'Array')
            ? responseTemplateHelper.buildTemplate(
                response.field as ResponseObjectMetadata | ResponseArrayField
              )
            : response.template,
      };
    });
  }
}
