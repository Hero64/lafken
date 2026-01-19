import { SfnStateMachine } from '@cdktf/provider-aws/lib/sfn-state-machine';
import type { S3Permissions, Services } from '@lafken/common';
import { type AppModule, lafkenResource, Role } from '@lafken/resolver';
import { Schema } from './schema/schema';
import type { DefinitionSchema, PermissionType } from './schema/schema.types';
import type { StateMachineProps } from './state-machine.types';

export class StateMachine extends lafkenResource.make(SfnStateMachine) {
  constructor(
    scope: AppModule,
    id: string,
    private props: StateMachineProps
  ) {
    const { resourceMetadata } = props;

    super(scope, `${id}-state-machine`, {
      name: resourceMetadata.name,
      roleArn: '',
      definition: '',
    });

    this.isGlobal(scope.id, id);
  }

  public async attachDefinition() {
    const { classResource } = this.props;

    const schema = new Schema(this, classResource);
    const definition = await schema.getDefinition();
    this.overrideRole(schema);

    if (!schema.hasUnresolvedDependency) {
      this.overrideDefinition(definition);
    }

    if (schema.hasUnresolvedDependency) {
      this.isDependent(async () => {
        this.overrideDefinition(await schema.resolveArguments(definition));
      });
    }
  }

  private overrideDefinition(definition: DefinitionSchema) {
    const { resourceMetadata } = this.props;

    this.addOverride(
      'definition',
      JSON.stringify({
        ...definition,
        QueryLanguage: 'JSONata',
        ExecutionType: resourceMetadata.executionType
          ? resourceMetadata.executionType.toUpperCase()
          : undefined,
      })
    );
  }

  private overrideRole(schema: Schema) {
    const { resourceMetadata, moduleName } = this.props;

    const permissions: Record<PermissionType, S3Permissions[]> = {
      read: ['GetObject', 'ListBucket'],
      write: ['GetObject', 'ListBucket', 'PutObject'],
    };

    const bucketServices: Services[] = Object.entries(schema.buckets).map(
      ([bucket, permission]) => {
        return {
          type: 's3',
          permissions: permissions[permission],
          resources: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
        };
      }
    );

    const roleName = `${resourceMetadata.name}-${moduleName}-role`;
    const role = new Role(this, roleName, {
      name: roleName,
      services: ({ getResourceValue }) => {
        const basePermissions: Services[] = ['cloudwatch', 'lambda', ...bucketServices];
        if (typeof resourceMetadata.services === 'function') {
          return [...basePermissions, ...resourceMetadata.services({ getResourceValue })];
        }

        return [...basePermissions, ...(resourceMetadata.services || [])];
      },
      principal: 'states.amazonaws.com',
    });

    this.addOverride('role_arn', role.arn);
  }
}
