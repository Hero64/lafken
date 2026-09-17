import type { PublishEventProps } from './publish.types';
import { signPublishRequest } from './sign';

const MAX_EVENTS_PER_BATCH = 5;

export class Publish {
  constructor(private props: PublishEventProps) {}

  public async exec() {
    const { httpDomain, channel, events } = this.props;

    if (events.length === 0 || events.length > MAX_EVENTS_PER_BATCH) {
      throw new Error(
        `channel publish accepts between 1 and ${MAX_EVENTS_PER_BATCH} events per batch, received ${events.length}`
      );
    }

    const body = JSON.stringify({
      channel,
      events: events.map((event) => JSON.stringify(event)),
    });

    const headers = await this.buildHeaders(body);

    const response = await fetch(`https://${httpDomain}/event`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `failed to publish event to channel "${channel}": ${response.status} ${await response.text()}`
      );
    }

    return response.json();
  }

  private async buildHeaders(body: string) {
    const { auth, httpDomain } = this.props;

    if (auth.type === 'iam') {
      return signPublishRequest({ httpDomain, region: auth.region, body });
    }

    return { 'content-type': 'application/json', ...auth.headers };
  }
}
