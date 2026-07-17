import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataPrototypeByKey,
  LambdaArgumentTypes,
  LambdaReflectKeys,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { ApiRequest } from '../request';
import { type ApiParamMetadata, QueryParam } from '../request/param';
import { EVENT_PROXY_METADATA_KEY, Event, EventProxy } from './event';

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

describe('EventProxy', () => {
  enableBuildEnvVariable();

  it('flags the method under EVENT_PROXY_METADATA_KEY and registers the event argument', () => {
    @ApiRequest()
    class TestPayload {
      @QueryParam()
      name: string;
    }

    class TestApi {
      test(@EventProxy(TestPayload) _e: TestPayload) {}
    }

    const proxyMethods = getMetadataPrototypeByKey<Record<string, boolean>>(
      TestApi,
      EVENT_PROXY_METADATA_KEY
    );
    expect(proxyMethods.test).toBe(true);

    const argsByMethod = getMetadataPrototypeByKey<Record<string, LambdaArgumentTypes[]>>(
      TestApi,
      LambdaReflectKeys.arguments
    );
    expect(argsByMethod.test).toContain(LambdaArgumentTypes.event);
  });

  it('generates the input model but does not store the runtime event class', () => {
    @ApiRequest()
    class TestPayload {
      @QueryParam()
      name: string;
    }

    class TestApi {
      test(@EventProxy(TestPayload) _e: TestPayload) {}
    }

    const eventParam = getMetadataPrototypeByKey<Record<string, ApiParamMetadata>>(
      TestApi,
      LambdaReflectKeys.event_param
    );
    expect(eventParam.test).toBeDefined();

    const eventClass = getMetadataPrototypeByKey<Record<string, unknown>>(
      TestApi,
      LambdaReflectKeys.event_class
    );
    expect(eventClass?.test).toBeUndefined();
  });

  it('supports being used without a request class', () => {
    class TestApi {
      test(@EventProxy() _e: unknown) {}
    }

    const proxyMethods = getMetadataPrototypeByKey<Record<string, boolean>>(
      TestApi,
      EVENT_PROXY_METADATA_KEY
    );
    expect(proxyMethods.test).toBe(true);

    const eventParam = getMetadataPrototypeByKey<Record<string, unknown>>(
      TestApi,
      LambdaReflectKeys.event_param
    );
    expect(eventParam?.test).toBeUndefined();
  });
});
