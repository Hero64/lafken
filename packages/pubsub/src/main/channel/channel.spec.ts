import 'reflect-metadata';
import { join } from 'node:path';
import {
  enableBuildEnvVariable,
  LambdaReflectKeys,
  type ResourceMetadata,
  ResourceReflectKeys,
} from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';
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
});
