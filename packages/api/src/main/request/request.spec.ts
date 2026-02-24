import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  type PayloadMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { ApiRequest, apiPayloadKey } from './request';

describe('ApiRequest', () => {
  enableBuildEnvVariable();
  it('should exist payload metadata', () => {
    @ApiRequest()
    class TestPayload {}

    const resource: PayloadMetadata = getMetadataByKey(TestPayload, apiPayloadKey);

    expect(resource).toBeDefined();
    expect(resource).toStrictEqual({
      name: 'TestPayload',
      id: 'TestPayload',
    });
  });
});
