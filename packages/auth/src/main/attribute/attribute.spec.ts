import {
  enableBuildEnvVariable,
  FieldProperties,
  getMetadataByKey,
  getMetadataPrototypeByKey,
  type PayloadMetadata,
} from '@alicanto/common';
import { Attributes, Custom, Standard } from './attribute';
import type {
  CustomAttributesMetadata,
  StandardAttributeMetadata,
} from './attribute.types';

describe('Attribute', () => {
  enableBuildEnvVariable();
  it('should create payload metadata', () => {
    @Attributes()
    class Test {}

    const metadata = getMetadataByKey<PayloadMetadata>(Test, FieldProperties.payload);

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('Test');
  });

  it('should create standard attributes', () => {
    @Attributes()
    class Test {
      @Standard({})
      fullname: string;

      @Standard({
        required: true,
        mutable: false,
      })
      phoneNumber: string;
    }

    const metadata = getMetadataPrototypeByKey<StandardAttributeMetadata[]>(
      Test,
      FieldProperties.field
    );

    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(2);
    expect(metadata).toStrictEqual([
      {
        attributeType: 'standard',
        destinationName: 'fullname',
        initialValue: undefined,
        mutable: true,
        name: 'fullname',
        required: true,
        type: 'String',
      },
      {
        attributeType: 'standard',
        destinationName: 'phoneNumber',
        initialValue: undefined,
        mutable: false,
        name: 'phoneNumber',
        required: true,
        type: 'String',
      },
    ]);
  });

  it('should create custom attributes', () => {
    @Attributes()
    class Test {
      @Custom({
        maxLen: 1000,
      })
      foo: string;

      @Custom({
        mutable: false,
        max: 10,
      })
      bar: number;
    }

    const metadata = getMetadataPrototypeByKey<CustomAttributesMetadata[]>(
      Test,
      FieldProperties.field
    );

    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(2);
    expect(metadata).toStrictEqual([
      {
        maxLen: 1000,
        attributeType: 'custom',
        destinationName: 'foo',
        initialValue: undefined,
        mutable: true,
        name: 'foo',
        type: 'String',
      },
      {
        max: 10,
        attributeType: 'custom',
        destinationName: 'bar',
        initialValue: undefined,
        mutable: false,
        name: 'bar',
        type: 'Number',
      },
    ]);
  });

  it('should create mixed attributes', () => {
    @Attributes()
    class Test {
      @Standard({
        mutable: false,
      })
      nickname: string;

      @Custom({
        mutable: false,
        max: 10,
      })
      bar: number;
    }

    const metadata = getMetadataPrototypeByKey<CustomAttributesMetadata[]>(
      Test,
      FieldProperties.field
    );

    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(2);
    expect(metadata).toStrictEqual([
      {
        attributeType: 'standard',
        destinationName: 'nickname',
        initialValue: undefined,
        mutable: false,
        required: true,
        name: 'nickname',
        type: 'String',
      },
      {
        max: 10,
        attributeType: 'custom',
        destinationName: 'bar',
        initialValue: undefined,
        mutable: false,
        name: 'bar',
        type: 'Number',
      },
    ]);
  });
});
