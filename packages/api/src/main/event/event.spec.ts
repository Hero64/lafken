import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
  type PayloadMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { type ApiObjectParam, type ApiParamMetadata, Field, Param } from '../field';
import { apiPayloadKey, Event, Payload, Response } from './event';
import type { ResponseMetadata } from './event.types';

describe('Event', () => {
  enableBuildEnvVariable();

  describe('Payload', () => {
    it('should exist payload metadata', () => {
      @Payload()
      class TestPayload {}

      const resource: PayloadMetadata = getMetadataByKey(TestPayload, apiPayloadKey);

      expect(resource).toBeDefined();
      expect(resource).toStrictEqual({
        name: 'TestPayload',
        id: 'TestPayload',
      });
    });
  });

  describe('Response', () => {
    it('should exist response metadata', () => {
      @Response({
        defaultCode: 201,
      })
      class TestResponse {}

      const resource: ResponseMetadata = getMetadataByKey(TestResponse, apiPayloadKey);

      expect(resource).toBeDefined();
      expect(resource.name).toBe('TestResponse');
      expect(resource.id).toBe('TestResponse');
      expect(resource.defaultCode).toBe(201);
    });

    it('should add other responses status', () => {
      @Payload()
      class Response400 {
        @Field()
        foo: string;
      }

      @Payload()
      class Response500 {
        @Field()
        bar: string;
      }

      @Response({
        defaultCode: 201,
        responses: {
          '400': Response400,
          '500': Response500,
          '404': true,
        },
      })
      class TestResponse {}

      const resource: ResponseMetadata = Reflect.getMetadata(apiPayloadKey, TestResponse);

      expect(resource).toBeDefined();
      expect(resource.name).toBe('TestResponse');
      expect(resource.responses?.[400]).toBeDefined();
      expect(resource.responses?.[400] as ApiObjectParam).toBeDefined();
      expect(resource.responses?.[500]).toBeDefined();
      expect((resource.responses?.[500] as ApiObjectParam).properties).toBeDefined();
      expect(resource.responses?.[404]).toBeDefined();
    });
  });

  describe('Event', () => {
    it('should exist event metadata', () => {
      @Payload()
      class TestPayload {
        @Param()
        name: string;
      }

      class TestApi {
        test(@Event(TestPayload) _e: TestPayload) {}
      }

      const resource = getMetadataPrototypeByKey<Record<string, ApiParamMetadata[]>>(
        TestApi,
        LambdaReflectKeys.event_param
      );

      expect(resource.test).toBeDefined();
      expect(resource.test).toMatchObject({
        destinationName: 'event',
        name: 'event',
        payload: { id: 'TestPayload_1', name: 'TestPayload' },
        properties: [
          {
            destinationName: 'name',
            name: 'name',
            source: 'query',
            type: 'String',
            validation: { required: true },
          },
        ],
        type: 'Object',
      });
    });
  });
});
