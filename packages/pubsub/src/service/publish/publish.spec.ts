import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Publish } from './publish';

describe('Publish', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ successful: [{ id: '1' }], failed: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the channel and events to the event api', async () => {
    const publish = new Publish({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      channel: '/default/room-1',
      events: [{ hello: 'world' }],
      auth: { type: 'headers', headers: { 'x-api-key': 'test-key' } },
    });

    await publish.exec();

    expect(fetch).toHaveBeenCalledWith(
      'https://abc123.appsync-api.us-east-1.amazonaws.com/event',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
        body: JSON.stringify({
          channel: '/default/room-1',
          events: ['{"hello":"world"}'],
        }),
      })
    );
  });

  it('signs the request when using iam auth', async () => {
    const publish = new Publish({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      channel: '/default/room-1',
      events: [{ hello: 'world' }],
      auth: { type: 'iam', region: 'us-east-1' },
    });

    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    await publish.exec();

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit!.headers as Record<string, string>;
    expect(headers.authorization).toContain('AWS4-HMAC-SHA256');
  });

  it('throws when there are no events', async () => {
    const publish = new Publish({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      channel: '/default/room-1',
      events: [],
      auth: { type: 'headers', headers: {} },
    });

    await expect(publish.exec()).rejects.toThrow(
      'channel publish accepts between 1 and 5'
    );
  });

  it('throws when there are more than 5 events', async () => {
    const publish = new Publish({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      channel: '/default/room-1',
      events: Array.from({ length: 6 }, (_, i) => ({ i })),
      auth: { type: 'headers', headers: {} },
    });

    await expect(publish.exec()).rejects.toThrow(
      'channel publish accepts between 1 and 5'
    );
  });

  it('throws with the response body when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })
    );

    const publish = new Publish({
      httpDomain: 'abc123.appsync-api.us-east-1.amazonaws.com',
      channel: '/default/room-1',
      events: [{ hello: 'world' }],
      auth: { type: 'headers', headers: {} },
    });

    await expect(publish.exec()).rejects.toThrow(
      'failed to publish event to channel "/default/room-1": 403 Forbidden'
    );
  });
});
