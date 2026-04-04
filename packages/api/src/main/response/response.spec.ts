import 'reflect-metadata';
import { enableBuildEnvVariable, getMetadataByKey } from '@lafken/common';
import { describe, expect, it } from 'vitest';
import type { ApiObjectMetadata } from '../request/param';
import { ResField } from './field';
import { ApiResponse, apiResponseKey, ResponseObject } from './response';
import type { ResponseMetadata } from './response.types';

describe('Response', () => {
  enableBuildEnvVariable();
  it('should exist response metadata', () => {
    @ApiResponse({
      defaultCode: 201,
    })
    class TestResponse {}

    const resource: ResponseMetadata<any> = getMetadataByKey(
      TestResponse,
      apiResponseKey
    );

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

    const resource: ResponseMetadata<any> = Reflect.getMetadata(
      apiResponseKey,
      TestResponse
    );

    expect(resource).toBeDefined();
    expect(resource.name).toBe('TestResponse');
    expect(resource.responses?.[400]).toBeDefined();
    expect(resource.responses?.[400] as ApiObjectMetadata).toBeDefined();
    expect(resource.responses?.[500]).toBeDefined();
    expect((resource.responses?.[500] as ApiObjectMetadata).properties).toBeDefined();
    expect(resource.responses?.[404]).toBeDefined();
  });
});
