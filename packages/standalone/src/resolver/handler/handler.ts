import {
  type AppModule,
  getAppContext,
  LambdaHandler,
  lafkenResource,
  Role,
} from '@lafken/resolver';
import type { HandlerProps } from './handler.types';

const GlobalLambdaHandler = lafkenResource.make(LambdaHandler);

export class Handler extends GlobalLambdaHandler {
  constructor(
    protected scope: AppModule,
    id: string,
    protected props: HandlerProps
  ) {
    const { handlerMetadata, resourceMetadata } = props;

    super(scope, id, {
      filename: resourceMetadata.filename,
      foldername: resourceMetadata.foldername,
      name: handlerMetadata.name,
      originalName: resourceMetadata.originalName,
      lambda: handlerMetadata.lambda,
      principal: handlerMetadata?.invocator?.principalPermission,
    });

    this.createInvokeRole(id);

    if (props.handlerMetadata.ref) {
      this.register('lambda', props.handlerMetadata.ref);
    }
  }

  private createInvokeRole(id: string) {
    const { invocator = {} } = this.props.handlerMetadata;
    const { principalPermission: _exclude, ...rolePermissions } = invocator;

    if (Object.values(rolePermissions).length === 0) {
      return;
    }

    const appContext = getAppContext(this);

    const role = new Role(this, 'handler-role', {
      name: `${appContext.contextCreator}-${id.toLocaleLowerCase()}-invoke-role`,
      principal: rolePermissions.principalRole,
      services: (props) => [
        ...(Array.isArray(rolePermissions.services) ||
        rolePermissions.services === undefined
          ? rolePermissions.services || []
          : rolePermissions.services(props)),
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: [this.arn],
        },
      ],
    });

    if (this.props.handlerMetadata.ref) {
      role.register('lambda', this.props.handlerMetadata.ref);
    }
  }
}
