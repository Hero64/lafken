import { Event, Fifo, Queue, Standard } from '@alicanto/queue/main';
import { QueuePayloadEvent } from './greeting.field';

@Queue({
  minify: false,
})
export class GreetingQueues {
  @Standard({
    queueName: 'greeting-standard-queue',
  })
  standard(
    @Event(QueuePayloadEvent)
    e: QueuePayloadEvent
  ) {
    console.log('from queue', e);
  }

  @Fifo({
    queueName: 'greeting-fifo-queue',
    batchSize: 1,
  })
  fifo() {
    console.log('fifo queue');
  }
}
