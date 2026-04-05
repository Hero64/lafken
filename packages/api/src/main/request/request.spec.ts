import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  type PayloadMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import type { ApiPayloadMetadata } from './param/param.types';
import { ApiRequest, apiRequestKey } from './request';

describe('ApiRequest', () => {
  enableBuildEnvVariable();
  it('should exist payload metadata', () => {
    @ApiRequest()
    class TestPayload {}

    const resource: PayloadMetadata = getMetadataByKey(TestPayload, apiRequestKey);

    expect(resource).toBeDefined();
    expect(resource).toStrictEqual({
      additionalProperties: false,
      name: 'TestPayload',
      id: 'TestPayload',
    });
  });

  it('should set additionalProperties to true when specified', () => {
    @ApiRequest({ additionalProperties: true })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.additionalProperties).toBe(true);
  });

  it('should set description when specified', () => {
    @ApiRequest({ description: 'User creation payload' })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.description).toBe('User creation payload');
  });

  it('should set custom name when specified', () => {
    @ApiRequest({ name: 'CustomPayload' })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.name).toBe('CustomPayload');
    expect(resource.id).toBe('CustomPayload');
  });

  it('should store oneOf schema combiner', () => {
    @ApiRequest({
      oneOf: [
        { properties: { field: { type: 'string' } }, required: ['field' as never] },
      ],
    })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.oneOf).toStrictEqual([
      { properties: { field: { type: 'string' } }, required: ['field'] },
    ]);
  });

  it('should store allOf schema combiner', () => {
    @ApiRequest({
      allOf: [{ required: ['name' as never] }, { required: ['age' as never] }],
    })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.allOf).toStrictEqual([{ required: ['name'] }, { required: ['age'] }]);
  });

  it('should store not schema combiner', () => {
    @ApiRequest({
      not: { required: ['forbidden' as never] },
    })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.not).toStrictEqual({ required: ['forbidden'] });
  });

  it('should store multiple properties together', () => {
    @ApiRequest({
      additionalProperties: true,
      description: 'Combined payload',
      oneOf: [{ properties: { x: { type: 'number' } } }],
    })
    class TestPayload {}

    const resource: ApiPayloadMetadata<TestPayload> = getMetadataByKey(
      TestPayload,
      apiRequestKey
    );

    expect(resource.additionalProperties).toBe(true);
    expect(resource.description).toBe('Combined payload');
    expect(resource.oneOf).toStrictEqual([{ properties: { x: { type: 'number' } } }]);
    expect(resource.name).toBe('TestPayload');
  });
});
