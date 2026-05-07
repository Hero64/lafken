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
    });

    this.createInvokeRole(id);

    if (props.handlerMetadata.ref) {
      this.register('lambda', props.handlerMetadata.ref);
    }
  }

  private createInvokeRole(id: string) {
    const { invocator } = this.props.handlerMetadata;

    if (!invocator) {
      return;
    }

    const appContext = getAppContext(this);

    const role = new Role(this, 'handler-role', {
      name: `${appContext.contextCreator}-${id.toLocaleLowerCase()}-invoke-role`,
      principal: invocator.principal,
      services: (props) => [
        ...(Array.isArray(invocator.services)
          ? invocator.services
          : invocator.services(props)),
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: [this.arn],
        },
      ],
    });

    if (invocator.roleRef) {
      role.register('role', invocator.roleRef);
    }
  }
}
