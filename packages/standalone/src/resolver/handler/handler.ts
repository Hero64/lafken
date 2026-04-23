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

    this.isGlobal(scope.id, `handler::${props.handlerMetadata.name}`);
  }

  private createInvokeRole(id: string) {
    const { invocatorService } = this.props.handlerMetadata;

    if (!invocatorService) {
      return;
    }

    const appContext = getAppContext(this);

    const role = new Role(this, 'handler-role', {
      name: `${appContext.contextCreator}-${id.toLocaleLowerCase()}-invoke-role`,
      principal: invocatorService,
      services: [
        {
          type: 'lambda',
          permissions: ['InvokeFunction'],
          resources: [this.arn],
        },
      ],
    });

    role.isGlobal(this.scope.id, `handler::role::${this.props.handlerMetadata.name}`);
  }
}
