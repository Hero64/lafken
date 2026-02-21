import { describe, expect, it } from 'vitest';
import { enableBuildEnvVariable, getMetadataByKey } from '../../utils';
import { createFieldName, FieldProperties } from '../field';
import { createPayloadDecorator } from './payload';
import type { PayloadMetadata } from './payload.types';

describe('Payload decorator', () => {
  enableBuildEnvVariable();
  const Payload = createPayloadDecorator({ prefix: 'test' });

  it('should exist payload metadata', () => {
    @Payload({
      name: 'test-payload',
    })
    class TestPayload {}

    const metadata = getMetadataByKey<PayloadMetadata>(
      TestPayload,
      createFieldName('test', FieldProperties.payload)
    );

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('test-payload');
  });
});
