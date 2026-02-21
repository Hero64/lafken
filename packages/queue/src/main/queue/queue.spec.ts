import 'reflect-metadata';
import { join } from 'node:path';
import {
  type ClassResource,
  enableBuildEnvVariable,
  LambdaReflectKeys,
  type ResourceMetadata,
  ResourceReflectKeys,
} from '@lafken/common';
import { beforeAll, describe, expect, it } from 'vitest';
import { Event, Field, Param, Payload } from '../event';
import { Fifo, Queue, RESOURCE_TYPE, Standard } from './queue';
import type { QueueLambdaMetadata } from './queue.types';

describe('Queue Decorator', () => {
  beforeAll(() => {
    enableBuildEnvVariable();
  });

  describe('Resource', () => {
    let resource: ResourceMetadata;
    let testQueue: ClassResource;
    beforeAll(() => {
      @Queue()
      class TestQueue {}

      testQueue = TestQueue;

      resource = Reflect.getMetadata(ResourceReflectKeys.resource, TestQueue);
    });

    it('Should exist queue resource', () => {
      expect(resource).toBeDefined();
    });

    it('Should be a queue resource', () => {
      expect(resource.type).toBe(RESOURCE_TYPE);
    });

    it('Should get resource params', () => {
      expect(resource.name).toBe(testQueue.name);
    });

    it('Should identify class folder ', () => {
      expect(join(resource.foldername, resource.filename)).toBe(__filename);
    });
  });

  describe('Fifo', () => {
    let handlers: QueueLambdaMetadata[];
    beforeAll(() => {
      @Queue()
      class TestQueue {
        @Fifo({
          deliveryDelay: 1000,
          contentBasedDeduplication: true,
        })
        testFifo() {}
      }

      handlers =
        Reflect.getMetadata(LambdaReflectKeys.handlers, TestQueue.prototype) || [];
    });

    it('Should create a fifo resources', () => {
      expect(handlers.length > 0).toBeTruthy();
    });

    it('Should contain test method', () => {
      expect(handlers[0].name).toBe('testFifo');
    });

    it('Should contain fifo options', () => {
      expect(handlers[0].isFifo).toBeTruthy();
    });
  });

  describe('Standard', () => {
    let handlers: QueueLambdaMetadata[];
    beforeAll(() => {
      @Queue()
      class TestQueue {
        @Standard({
          deliveryDelay: 1000,
        })
        testStandard() {}
      }

      handlers =
        Reflect.getMetadata(LambdaReflectKeys.handlers, TestQueue.prototype) || [];
    });

    it('Should create a standard resources', () => {
      expect(handlers.length > 0).toBeTruthy();
    });

    it('Should contain test method', () => {
      expect(handlers[0].name).toBe('testStandard');
    });

    it('Should contain standard options', () => {
      expect(handlers[0].isFifo).toBeFalsy();
    });
  });

  describe('Queue execution', () => {
    // enableBuildEnvVariable();

    @Payload()
    class Body {
      @Field()
      foo: string;

      @Field()
      bar: number;
    }

    @Payload()
    class EventPayload {
      @Param({
        source: 'attribute',
      })
      name: string;

      @Param({
        source: 'body',
        parse: true,
        type: Body,
      })
      body: Body;
    }

    @Queue()
    class TestQueue {
      @Fifo({
        deliveryDelay: 1000,
        contentBasedDeduplication: true,
      })
      testWithEvent(@Event(EventPayload) e: EventPayload) {
        return e;
      }
    }
    const testQueue = new TestQueue();

    it('should pass event to callback', async () => {
      const event = {
        Records: [
          {
            body: JSON.stringify({ body: { foo: 'test', bar: 1 } }),
            messageId: '1',
            messageAttributes: {
              name: {
                stringValue: 'aaa',
                dataType: 'String',
              },
            },
          },
        ],
      } as unknown as any;

      const response = await (testQueue as any).testWithEvent(event);

      expect(response).toStrictEqual([{ name: 'aaa', body: { foo: 'test', bar: 1 } }]);
    });
  });
});
