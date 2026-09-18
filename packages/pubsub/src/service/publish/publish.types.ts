export interface PublishHeadersAuth {
  type: 'headers';
  /**
   * Authorization headers for the request (e.g. `{ 'x-api-key': '...' }`
   * or `{ authorization: '...' }`), matching the Event API's configured
   * publish authorization mode (`API_KEY`, `AMAZON_COGNITO_USER_POOLS` or
   * `AWS_LAMBDA`).
   */
  headers: Record<string, string>;
}

export interface PublishIamAuth {
  type: 'iam';
  /**
   * AWS region of the Event API.
   *
   * @default process.env.AWS_REGION
   */
  region?: string;
}

export type PublishAuth = PublishHeadersAuth | PublishIamAuth;

export interface PublishEventProps {
  /**
   * Event API HTTP domain (e.g. `abc123.appsync-api.us-east-1.amazonaws.com`),
   * without protocol. Typically injected via a Lambda environment variable
   * resolved with `getResourceValue('event-api::<name>', 'httpDomain')`.
   */
  httpDomain: string;
  /** Channel to publish to, e.g. `/default/room-1`. */
  channel: string;
  /**
   * Events to publish. Up to 5 per batch — AWS AppSync Events rejects
   * larger batches.
   */
  events: unknown[];
  /**
   * How to authorize the publish request.
   *
   * Use `{ type: 'iam' }` for the `AWS_IAM` mode — the request is signed
   * with SigV4 using the caller's ambient AWS credentials (AWS's
   * recommended mode for backend publishers). Use
   * `{ type: 'headers', headers }` for `API_KEY`, `AMAZON_COGNITO_USER_POOLS`
   * or `AWS_LAMBDA`, where the token/key is supplied directly.
   */
  auth: PublishAuth;
}
