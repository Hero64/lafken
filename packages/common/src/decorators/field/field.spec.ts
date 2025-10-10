// import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '../../utils';
// import { createFieldDecorator } from './field';
// import type { FieldMetadata, FieldProps } from './field.types';

// describe('Field decorator', () => {
//   enableBuildEnvVariable();
//   const TestField = createFieldDecorator<FieldProps, FieldMetadata>(
//     (_props, field) => field,
//     'TEST_FIELD',
//     'TEST_PAYLOAD'
//   );

//   it('should exist fields in TestPayload', () => {
//     class TestPayload {
//       @TestField({
//         name: 'foo',
//       })
//       bar: string;
//     }

//     const fields = getMetadataPrototypeByKey<FieldMetadata[]>(TestPayload, 'TEST_FIELD');

//     expect(fields).toBeDefined();
//     expect(fields[0].name).toBe('foo');
//     expect(fields[0].destinationField).toBe('bar');
//     expect(fields[0].fieldType).toBe('String');
//   });
// });
