import { describe, expect, it } from 'vitest';
import { enableBuildEnvVariable, getMetadataPrototypeByKey } from '../../utils';
import { createFieldDecorator, createFieldName, getEventFields } from './field';
import { type FieldMetadata, FieldProperties, type FieldProps } from './field.types';

describe('Field', () => {
  enableBuildEnvVariable();
  it('should create a param decorator', () => {
    const TestDecorator = createFieldDecorator({
      prefix: 'test',
      getMetadata: () => ({}),
    });

    expect(typeof TestDecorator).toBe('function');
    expect(typeof TestDecorator()).toBe('function');
  });

  it('should get metadata from simple field', () => {
    const TestDecorator = createFieldDecorator<FieldProps, FieldMetadata>({
      prefix: 'test',
      getMetadata: () => ({}),
    });

    class Test {
      @TestDecorator({
        name: 'test-name',
      })
      name: string;
    }

    const metadata = getMetadataPrototypeByKey<FieldMetadata[]>(
      Test,
      createFieldName('test', FieldProperties.field)
    );

    expect(metadata).toHaveLength(1);
    expect(metadata).toContainEqual({
      name: 'test-name',
      destinationName: 'name',
      type: 'String',
    });
  });

  it('should create metadata from custom field', () => {
    interface CustomProps extends FieldProps {
      source: string;
      foo: number;
    }

    type CustomMetadata = FieldMetadata & CustomProps;

    const TestDecorator = createFieldDecorator<CustomProps, CustomMetadata>({
      prefix: 'test',
      getMetadata: (props) => ({
        foo: props?.foo || 1,
        source: props?.source || '',
      }),
    });

    class Test {
      @TestDecorator({
        name: 'test-name',
        foo: 100,
        source: 'test',
      })
      name: string;
    }

    const metadata = getMetadataPrototypeByKey<CustomMetadata[]>(
      Test,
      createFieldName('test', FieldProperties.field)
    );

    expect(metadata).toHaveLength(1);
    expect(metadata).toContainEqual({
      name: 'test-name',
      destinationName: 'name',
      type: 'String',
      foo: 100,
      source: 'test',
    });
  });

  it('should create a field with object value', () => {
    const TestDecorator = createFieldDecorator({
      prefix: 'test',
      getMetadata: () => ({}),
    });

    class SubField {
      @TestDecorator()
      name: string;
    }

    class Test {
      @TestDecorator({
        type: SubField,
      })
      data: SubField;
    }

    const metadata = getMetadataPrototypeByKey<FieldMetadata[]>(
      Test,
      createFieldName('test', FieldProperties.field)
    );

    expect(metadata).toHaveLength(1);
    expect(metadata).toContainEqual({
      destinationName: 'data',
      name: 'data',
      payload: { id: 'SubField', name: 'SubField' },
      properties: [
        {
          destinationName: 'name',
          name: 'name',
          type: 'String',
        },
      ],
      type: 'Object',
    });
  });

  it('should create a field with array value', () => {
    const TestDecorator = createFieldDecorator({
      prefix: 'test',
      getMetadata: () => ({}),
    });

    class SubField {
      @TestDecorator()
      name: string;
    }

    class Test {
      @TestDecorator({
        type: [SubField],
      })
      data: SubField[];
    }

    const metadata = getMetadataPrototypeByKey<FieldMetadata[]>(
      Test,
      createFieldName('test', FieldProperties.field)
    );

    expect(metadata).toHaveLength(1);
    expect(metadata).toContainEqual({
      destinationName: 'data',
      name: 'data',
      type: 'Array',
      items: {
        destinationName: 'Object',
        name: 'Object',
        payload: { id: 'SubField', name: 'SubField' },
        properties: [
          {
            destinationName: 'name',
            name: 'name',
            type: 'String',
          },
        ],
        type: 'Object',
      },
    });
  });
  it('should get field by object event', () => {
    const TestDecorator = createFieldDecorator({
      prefix: 'test',
      getMetadata: () => ({}),
    });

    class Test {
      @TestDecorator()
      name: string;
    }

    const event = getEventFields('test', Test);

    expect(event).toEqual({
      destinationName: 'event',
      name: 'event',
      payload: { id: 'Test', name: 'Test' },
      properties: [
        {
          destinationName: 'name',
          name: 'name',
          type: 'String',
        },
      ],
      type: 'Object',
    });
  });

  it('should get field by primitive event', () => {
    const event = getEventFields('test', 'test value');

    expect(event).toEqual({
      destinationName: 'event',
      initialValue: 'test value',
      name: 'event',
      type: 'String',
    });
  });
});
