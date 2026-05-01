import { ResolveResources, Role } from '@lafken/resolver';
import type { ResponseArrayField, ResponseObjectMetadata } from '../../../../../../main';
import type { ResponseHandler } from '../response/response.types';
import type { ResponseTemplateHelper } from '../response-template/response-template';
import type { CreateRoleProps, IntegrationOption } from './integration.types';

export class IntegrationHelper {
  public createRole(props: CreateRoleProps) {
    const { name, scope, service, additionalServices = [] } = props;

    const role = new Role(scope, `${name}-role`, {
      name: `${name}-integration`,
      principal: 'apigateway.amazonaws.com',
      services: (props) => {
        return [
          service,
          ...(Array.isArray(additionalServices)
            ? additionalServices
            : additionalServices(props)),
        ];
      },
    });

    return role;
  }

  public generateIntegrationOptions(module?: string): IntegrationOption {
    const resolveResource = new ResolveResources();

    return {
      options: {
        getResourceValue(value, type) {
          if (module) {
            return resolveResource.getResourceValue(module, value, type);
          }

          const [internModule, resourceValue] = value.replace('::', '##').split('##');
          return resolveResource.getResourceValue(internModule, resourceValue, type);
        },
        getCurrentDate() {
          return '$context.requestTimeEpoch';
        },
      },
      resolveResource,
    };
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
