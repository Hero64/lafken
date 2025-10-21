import { enableBuildEnvVariable, getMetadataByKey } from '../../utils';
import { FieldProperties } from '../field';
import { createPayloadDecorator } from './payload';
import type { PayloadMetadata } from './payload.types';

describe('Payload decorator', () => {
  enableBuildEnvVariable();
  const Payload = createPayloadDecorator({});

  it('should exist payload metadata', () => {
    @Payload({
      name: 'test-payload',
    })
    class TestPayload {}

    const metadata = getMetadataByKey<PayloadMetadata>(
      TestPayload,
      FieldProperties.payload
    );

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('test-payload');
  });
});
