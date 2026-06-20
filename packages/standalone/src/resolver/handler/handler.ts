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
      description: handlerMetadata.description,
      lambda: handlerMetadata.lambda,
      principal: handlerMetadata.invoke?.permission?.principal,
      sourceArn: handlerMetadata.invoke?.permission?.sourceArn,
      sourceAccount: handlerMetadata.invoke?.permission?.sourceAccount,
    });

    this.createInvokeRole(id);

    if (props.handlerMetadata.ref) {
      this.register('lambda', props.handlerMetadata.ref);
    }
  }

  private createInvokeRole(id: string) {
    const { role } = this.props.handlerMetadata.invoke ?? {};

    if (!role) {
      return;
    }

    const appContext = getAppContext(this);

    const invokeRole = new Role(this, 'handler-role', {
      name: `${appContext.contextCreator}-${id.toLocaleLowerCase()}-invoke-role`,
      principal: role.principal,
      services: (props) => [
        ...(Array.isArray(role.services) || role.services === undefined
          ? role.services || []
          : role.services(props)),
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: [this.arn],
        },
      ],
    });

    if (role.ref) {
      invokeRole.register('lambda', role.ref);
    }
  }
}
