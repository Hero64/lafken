import { AppsyncApi } from '@cdktn/provider-aws/lib/appsync-api';
import { lafkenResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import { AuthorizerFactory } from '../authorizer/authorizer';
import type { EventApiOptions } from './event-api.types';

export class EventApi extends lafkenResource.make(AppsyncApi) {
  public readonly authorizerFactory: AuthorizerFactory;

  constructor(scope: Construct, id: string, props: EventApiOptions) {
    super(scope, id, {
      name: props.name,
      ownerContact: props.ownerContact,
      tags: props.tags,
    });

    this.register('event-api', props.name);

    this.authorizerFactory = new AuthorizerFactory(this, {
      authorizers: props.authorizers || [],
    });

    const authModes = this.authorizerFactory.authProviders.map((provider) => ({
      authType: provider.authType,
    }));

    this.putEventConfig([
      {
        authProvider: this.authorizerFactory.authProviders,
        connectionAuthMode: authModes,
        defaultPublishAuthMode: authModes,
        defaultSubscribeAuthMode: authModes,
      },
    ]);
  }

  /**
   * HTTP domain used to publish events (`POST https://{httpDomain}/event`).
   * `dns` is a Terraform map (`{ http, realtime }`); this reads out the
   * single value so it can flow into a Lambda env var via
   * `getResourceValue('event-api::<name>', 'httpDomain')`.
   */
  get httpDomain() {
    return this.dns.lookup('http');
  }

  /** WebSocket domain used to connect/subscribe (`wss://{realtimeDomain}/event/realtime`). */
  get realtimeDomain() {
    return this.dns.lookup('realtime');
  }
}
