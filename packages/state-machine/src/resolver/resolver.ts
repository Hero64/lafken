import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@alicanto/common';
import {
  type AppModule,
  type AppStack,
  lambdaAssets,
  type ResolverType,
  Role,
} from '@alicanto/resolver';

import {
  type LambdaStateMetadata,
  RESOURCE_TYPE,
  type StateMachineResourceMetadata,
} from '../main';
import { StateMachine } from './state-machine/state-machine';

export class StateMachineResolver implements ResolverType {
  public type = RESOURCE_TYPE;
  private role: Role;

  public async beforeCreate(scope: AppStack) {
    this.role = new Role(scope, 'state-machine-global-role', {
      name: 'state-machine-global-role',
      services: [
        'cloudwatch',
        'lambda',
        'kms',
        'state_machine',
        {
          type: 's3',
          permissions: ['PutObject', 'GetObject', 'ListBucket'],
        },
      ],
      principal: 'states.amazonaws.com',
    });
  }

  public async create(module: AppModule, resource: ClassResource) {
    const metadata = getResourceMetadata<StateMachineResourceMetadata>(resource);
    const handlers = getResourceHandlerMetadata<LambdaStateMetadata>(resource);

    lambdaAssets.initializeMetadata(metadata.foldername, metadata.filename, {
      className: metadata.originalName,
      methods: handlers.map((handler) => handler.name),
    });

    const stateMachine = new StateMachine(module, metadata.name, {
      classResource: resource,
      resourceMetadata: metadata,
      role: this.role,
    });

    await stateMachine.create();
  }
}
