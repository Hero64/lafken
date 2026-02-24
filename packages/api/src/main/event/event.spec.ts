import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { ApiRequest } from '../request';
import { type ApiParamMetadata, QueryParam } from '../request/params';
import { Event } from './event';

describe('Event', () => {
  enableBuildEnvVariable();
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
