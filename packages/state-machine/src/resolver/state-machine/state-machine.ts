import { CloudwatchLogGroup } from '@cdktn/provider-aws/lib/cloudwatch-log-group';
import { SfnStateMachine } from '@cdktn/provider-aws/lib/sfn-state-machine';
import type { S3Permissions, Services } from '@lafken/common';
import { type AppModule, lafkenResource, ResourceOutput, Role } from '@lafken/resolver';
import { dependable, type TerraformResource } from 'cdktn';
import type {
  StateMachineOutputAttributes,
  StateMachineResourceMetadata,
} from '../../main';
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
      tracingConfiguration: resourceMetadata.enableTrace
        ? {
            enabled: true,
          }
        : undefined,
    });

    this.isGlobal(scope.id, `state-machine::${id}`);
    this.addLoggingConfiguration(resourceMetadata);
    new ResourceOutput<StateMachineOutputAttributes>(this, resourceMetadata.outputs);
  }

  public async attachDefinition() {
    const { classResource } = this.props;

    const schema = new Schema(this, classResource, { minify: this.props.minify });
    const definition = await schema.definition;
    this.overrideRole(schema);

    if (!schema.hasUnresolvedDependency) {
      this.overrideDefinition(definition);
      this.addDependency(...schema.resources);
    } else {
      this.isDependent(async () => {
        this.overrideDefinition(await schema.resolveArguments(definition));
        this.addDependency(...schema.resources);
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
      services: ({ getResourceValue, getSSMValue, fn, token }) => {
        const basePermissions: Services[] = ['cloudwatch', 'lambda', ...bucketServices];
        if (typeof resourceMetadata.services === 'function') {
          return [
            ...basePermissions,
            ...resourceMetadata.services({ getResourceValue, getSSMValue, fn, token }),
          ];
        }

        return [...basePermissions, ...(resourceMetadata.services || [])];
      },
      principal: 'states.amazonaws.com',
    });
    this.addDependency(role, role.policy);

    this.addOverride('role_arn', role.arn);
  }

  private addLoggingConfiguration(resourceMetadata: StateMachineResourceMetadata) {
    if (!resourceMetadata.loggingConfiguration) {
      return;
    }

    const logGroup = new CloudwatchLogGroup(this, 'sfn-logs', {
      name: resourceMetadata.loggingConfiguration.logGroupName,
      retentionInDays: resourceMetadata.loggingConfiguration.retentionInDays,
    });

    this.putLoggingConfiguration({
      includeExecutionData: resourceMetadata.loggingConfiguration.includeExecutionData,
      level: resourceMetadata.loggingConfiguration.level?.toUpperCase(),
      logDestination: `${logGroup.arn}:*`,
    });
    this.addDependency(logGroup);
  }

  private addDependency(...resource: TerraformResource[]) {
    this.dependsOn = [
      ...(this.dependsOn || []),
      ...resource.map((res) => dependable(res)),
    ];
  }
}
