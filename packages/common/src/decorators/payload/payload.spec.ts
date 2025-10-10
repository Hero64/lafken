// import { enableBuildEnvVariable, getMetadataByKey } from '../../utils';
// import { createPayloadDecorator } from './payload';
// import type { PayloadMetadata } from './payload.types';

// describe('Payload decorator', () => {
//   enableBuildEnvVariable();
//   const Payload = createPayloadDecorator((_props, metadata) => metadata, 'TEST_PAYLOAD');

//   it('should exist payload metadata', () => {
//     @Payload({
//       name: 'test-payload',
//     })
//     class TestPayload {}

//     const metadata = getMetadataByKey<PayloadMetadata>(TestPayload, 'TEST_PAYLOAD');

//     expect(metadata).toBeDefined();
//     expect(metadata.name).toBe('test-payload');
//   });
// });
