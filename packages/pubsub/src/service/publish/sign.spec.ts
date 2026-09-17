import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signPublishRequest } from './sign';

describe('signPublishRequest', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('signs the request with SigV4 headers', async () => {
    const headers = await signPublishRequest({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      region: 'us-east-1',
      body: JSON.stringify({ channel: '/default/room-1', events: ['{"hello":"world"}'] }),
    });

    expect(headers.host).toBe('abc123.appsync-api.us-east-1.amazonaws.com');
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
    expect(headers['x-amz-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
    expect(headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/us-east-1\/appsync\/aws4_request/
    );
  });

  it('falls back to AWS_REGION when no region is given', async () => {
    process.env.AWS_REGION = 'eu-west-1';

    const headers = await signPublishRequest({
      httpDomain: 'abc123.appsync-api.eu-west-1.amazonaws.com',
      body: '{}',
    });

    expect(headers.authorization).toContain('/eu-west-1/appsync/');
  });

  it('throws when no region is available', async () => {
    process.env.AWS_REGION = undefined;

    await expect(
      signPublishRequest({ httpDomain: 'abc123.appsync-api.amazonaws.com', body: '{}' })
    ).rejects.toThrow('iam publish auth requires a region');
  });
});
