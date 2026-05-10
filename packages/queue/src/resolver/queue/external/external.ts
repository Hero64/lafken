import { DataAwsSqsQueue } from '@cdktn/provider-aws/lib/data-aws-sqs-queue';
import {
  type AppModule,
  lafkenResource,
  resolveCallbackResource,
} from '@lafken/resolver';
import { QueueBase } from '../base/base';
import type { QueueProps } from '../queue.types';
import { sqsName } from '../queue.utils';

export class ExternalQueue extends QueueBase(lafkenResource.make(DataAwsSqsQueue)) {
  constructor(
    scope: AppModule,
    id: string,
    private props: QueueProps
  ) {
    const { handler } = props;

    super(scope, `${id}-queue`, {
      name: '',
    });

    this.setName();

    if (handler.ref) {
      this.register('queue', handler.ref);
    }

    this.validateEventParams(props);
    this.addEventSource(id, props);
  }

  private setName() {
    const { handler } = this.props;

    if (typeof handler.queueName === 'string') {
      this.name = sqsName(handler.queueName, handler.isFifo ? '.fifo' : '');
      return;
    }

    const queueName = resolveCallbackResource(this, handler.queueName);

    if (!queueName) {
      this.onResolve(() => {
        this.setName();

        if (!this.name) {
          throw new Error('Unresolved external queue name');
        }
      });
      return;
    }

    this.name = queueName;
  }
}
