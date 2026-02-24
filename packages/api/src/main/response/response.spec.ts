import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { Event } from '../event';
import { ApiRequest, apiPayloadKey } from '../request';
import {
  type ApiObjectMetadata,
  type ApiParamMetadata,
  QueryParam,
} from '../request/params';
import { ResField } from './field';
import { ApiResponse, ResponseObject } from './response';
import type { ResponseMetadata } from './response.types';

describe('Response', () => {
  enableBuildEnvVariable();
  it('should exist response metadata', () => {
    @ApiResponse({
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
    @ResponseObject()
    class Response400 {
      @ResField()
      foo: string;
    }

    @ResponseObject()
    class Response500 {
      @ResField()
      bar: string;
    }

    @ApiResponse({
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
    expect(resource.responses?.[400] as ApiObjectMetadata).toBeDefined();
    expect(resource.responses?.[500]).toBeDefined();
    expect((resource.responses?.[500] as ApiObjectMetadata).properties).toBeDefined();
    expect(resource.responses?.[404]).toBeDefined();
  });

  describe('Event', () => {
    it('should exist event metadata', () => {
      @ApiRequest()
      class TestPayload {
        @QueryParam()
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
        payload: { id: 'TestPayload', name: 'TestPayload' },
        properties: [
          {
            destinationName: 'name',
            name: 'name',
            source: 'query',
            type: 'String',
            required: true,
          },
        ],
        type: 'Object',
      });
    });
  });
});
