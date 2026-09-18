import 'reflect-metadata';
import { join } from 'node:path';
import {
  enableBuildEnvVariable,
  LambdaReflectKeys,
  type ResourceMetadata,
  ResourceReflectKeys,
} from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';
import { Event } from '../event/event';
import { Channel, OnPublish, OnSubscribe, RESOURCE_TYPE } from './channel';
import { type ChannelLambdaMetadata, ChannelOperation } from './channel.types';

describe('Channel Decorator', () => {
  beforeAll(() => {
    enableBuildEnvVariable();
  });

  describe('Resource', () => {
    let resource: ResourceMetadata;

    beforeAll(() => {
      @Channel({ namespace: 'chat' })
      class TestChannel {}

      resource = Reflect.getMetadata(ResourceReflectKeys.resource, TestChannel);
    });

    it('should exist channel resource', () => {
      expect(resource).toBeDefined();
    });

    it('should be a channel resource', () => {
      expect(resource.type).toBe(RESOURCE_TYPE);
    });

    it('should identify class folder', () => {
      expect(join(resource.foldername, resource.filename)).toBe(__filename);
    });
  });

  describe('OnPublish/OnSubscribe', () => {
    let handlers: ChannelLambdaMetadata[];

    beforeAll(() => {
      @Channel({ namespace: 'chat' })
      class TestChannel {
        @OnPublish()
        onMessage() {}

        @OnSubscribe()
        onJoin() {}
      }

      handlers = Reflect.getMetadata(LambdaReflectKeys.handlers, TestChannel.prototype);
    });

    it('should register both handlers', () => {
      expect(handlers).toHaveLength(2);
    });

    it('should tag the publish handler', () => {
      expect(handlers[0]).toMatchObject({
        name: 'onMessage',
        operation: ChannelOperation.publish,
      });
    });

    it('should tag the subscribe handler', () => {
      expect(handlers[1]).toMatchObject({
        name: 'onJoin',
        operation: ChannelOperation.subscribe,
      });
    });
  });

  describe('OnPublish response format', () => {
    // AWS AppSync Events' Direct Lambda `REQUEST_RESPONSE` integration has
    // no VTL/JS layer to reshape the response, so it requires the raw
    // Lambda return value to be `{ events: [...] }` — a bare array is
    // rejected with `DependencyFailedException`.
    class TestChannel {
      @OnPublish()
      passThrough(@Event() _event?: any) {}

      @OnPublish()
      drop(@Event() _event?: any) {
        return null;
      }

      @OnPublish()
      transform(@Event() event: any) {
        return event.events.map((e: any) => ({ ...e, payload: { seen: true } }));
      }
    }

    it('wraps an unchanged (undefined) return as the original events', async () => {
      const instance = new TestChannel();
      const events = [{ id: '1', payload: { message: 'hi' } }];

      await expect(instance.passThrough({ events } as any)).resolves.toEqual({
        events,
      });
    });

    it('wraps a null return as an empty events array', async () => {
      const instance = new TestChannel();

      await expect(
        instance.drop({ events: [{ id: '1', payload: {} }] } as any)
      ).resolves.toEqual({ events: [] });
    });

    it('wraps a returned array as the replacement events', async () => {
      const instance = new TestChannel();
      const events = [{ id: '1', payload: { message: 'hi' } }];

      await expect(instance.transform({ events } as any)).resolves.toEqual({
        events: [{ id: '1', payload: { seen: true } }],
      });
    });
  });
});
