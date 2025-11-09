import type {
  DynamoPermissions,
  S3Permissions,
  ServicesName,
  SQSPermissions,
  StateMachinePermissions,
} from '@alicanto/common';
import { alicantoResource, ResolveResources, Role } from '@alicanto/resolver';
import type { Construct } from 'constructs';
import type { IntegrationOption, ServiceRoleName } from './integration.types';

export class IntegrationHelper {
  public createRole(name: ServiceRoleName, scope: Construct) {
    const role = alicantoResource.getResource<Role>('role', name);

    if (role) {
      return role;
    }
    const serviceName = name.split('.')[0] as ServicesName;

    const serviceRole = new Role(scope, name, {
      name: name.replaceAll('.', '-'),
      services: [
        {
          type: serviceName,
          permissions: this.getPermissionByRoleName(name) as any[],
        },
      ],
      principal: 'apigateway.amazonaws.com',
    });

    serviceRole.isGlobal('role', name);
    return serviceRole;
  }

  public generateIntegrationOptions(module: string): IntegrationOption {
    const resolveResource = new ResolveResources();

    return {
      options: {
        getResourceValue(value, type) {
          return resolveResource.getResourceValue(module, value, type);
        },
        getCurrentDate() {
          return '$context.requestTimeEpoch';
        },
      },
      resolveResource,
    };
  }

  private getPermissionByRoleName(roleName: ServiceRoleName) {
    const permissionsByRole: Partial<
      Record<
        ServiceRoleName,
        (S3Permissions | StateMachinePermissions | DynamoPermissions | SQSPermissions)[]
      >
    > = {
      's3.read': ['GetObject'],
      's3.write': ['GetObject', 'PutObject'],
      's3.delete': ['DeleteObject'],
      'state_machine.read': ['DescribeExecution'],
      'state_machine.write': ['StopExecution', 'StartExecution'],
      'state_machine.delete': ['StopExecution'],
      'dynamodb.read': ['Query', 'GetItem', 'BatchGetItem'],
      'dynamodb.write': ['PutItem', 'UpdateItem'],
      'dynamodb.delete': ['DeleteItem'],
      'sqs.write': ['SendMessage'],
    };

    const permissions = permissionsByRole[roleName];

    if (permissions) {
      return permissions;
    }

    throw new Error(`permission not found by role ${roleName}`);
  }
}
