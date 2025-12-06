import {
  Api,
  Event,
  IntegrationOptions,
  Post,
  type QueueIntegrationOption,
  type QueueSendMessageIntegrationResponse,
} from '@alicanto/api/main';
import { ApiQueuePayload } from './greeting.field';

@Api({
  path: 'queue',
})
export class QueueIntegration {
  @Post({
    integration: 'queue',
    action: 'SendMessage',
  })
  sendMessage(
    @Event(ApiQueuePayload) e: ApiQueuePayload,
    @IntegrationOptions() { getResourceValue }: QueueIntegrationOption
  ): QueueSendMessageIntegrationResponse {
    return {
      queueName: getResourceValue('greeting::greeting-standard-queue', 'name'),
      attributes: {
        name: e.name,
      },
      body: e.body,
    };
  }
}
