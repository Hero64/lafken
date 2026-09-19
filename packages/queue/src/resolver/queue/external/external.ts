import { DataAwsSqsQueue } from '@cdktn/provider-aws/lib/data-aws-sqs-queue';
import { type AppModule, lafkenResource } from '@lafken/resolver';
import { Token } from 'cdktn';
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

    // A `getResourceValue()`/`getSSMValue()` reference is already a real
    // queue name (or a deferred token standing for one) — applying the
    // suffix/length-truncation logic below would corrupt it.
    if (Token.isUnresolved(handler.queueName)) {
      this.name = handler.queueName;
      return;
    }

    this.name = sqsName(handler.queueName, handler.isFifo ? '.fifo' : '');
  }
}
