import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
  type PayloadMetadata,
} from '@alicanto/common';

import { ApiReflectKeys } from '../api';
import { type FieldParams, Param, type ParamMetadata } from '../field';
import { Event, Payload, Response } from './event';
import type { ResponseMetadata } from './event.types';

describe('Event', () => {
  enableBuildEnvVariable();

  describe('Payload', () => {
    it('should exist payloadmetadata', () => {
      @Payload()
      class TestPayload {}

      const resource: PayloadMetadata = getMetadataByKey(
        TestPayload,
        ApiReflectKeys.PAYLOAD
      );

      expect(resource).toBeDefined();
      expect(resource.name).toBe('TestPayload');
      expect(resource.id).toBe('TestPayload');
    });
  });

  describe('Response', () => {
    it('should exist response metadata', () => {
      @Response({
        defaultCode: 201,
      })
      class TestResponse {}

      const resource: ResponseMetadata = getMetadataByKey(
        TestResponse,
        ApiReflectKeys.PAYLOAD
      );

      expect(resource).toBeDefined();
      expect(resource.name).toBe('TestResponse');
      expect(resource.id).toBe('TestResponse');
      expect(resource.defaultCode).toBe(201);
    });

    it('should add other responses status', () => {
      @Payload()
      class Response400 {}

      @Payload()
      class Response500 {}

      @Response({
        defaultCode: 201,
        responses: {
          '400': Response400,
          '500': Response500,
          '404': true,
        },
      })
      class TestResponse {}

      const resource: ResponseMetadata = getMetadataByKey(
        TestResponse,
        ApiReflectKeys.PAYLOAD
      );

      expect(resource).toBeDefined();
      expect(resource.name).toBe('TestResponse');
      expect(resource.responses?.[400]).toBeDefined();
      expect((resource.responses?.[400] as FieldParams).params).toBeDefined();
      expect(resource.responses?.[500]).toBeDefined();
      expect((resource.responses?.[500] as FieldParams).params).toBeDefined();
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

      const resource = getMetadataPrototypeByKey<Record<string, ParamMetadata[]>>(
        TestApi,
        LambdaReflectKeys.EVENT_PARAM
      );

      expect(resource.test).toBeDefined();
      expect(resource.test).toHaveLength(1);
    });
  });
});
