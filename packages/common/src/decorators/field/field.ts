import 'reflect-metadata';
import type { ClassResource } from '../../types';
import { getMetadataByKey, getMetadataPrototypeByKey } from '../../utils';
import { isBuildEnvironment } from '../../utils/build-env.utils';
import type { PayloadMetadata } from '../payload';
import {
  type AllowedTypes,
  type BaseFieldMetadata,
  type CreateFieldDecoratorProps,
  type FieldMetadata,
  FieldProperties,
  type FieldProps,
  type GetFieldMetadataProps,
  type PrimitiveTypes,
} from './field.types';

export const primitiveTypeValues = new Set<PrimitiveTypes>([
  'Boolean',
  'Number',
  'String',
]);

export const primitiveTypeofValues = new Set(['boolean', 'number', 'string']);

export const mapTypeofValueToPrimitiveType: Record<string, PrimitiveTypes> = {
  boolean: 'Boolean',
  number: 'Number',
  string: 'String',
};

export const getPrimitiveType = (type: AllowedTypes): PrimitiveTypes | undefined => {
  if (type === String) return 'String';
  if (type === Number) return 'Number';
  if (type === Boolean) return 'Boolean';
};

export const getEventFields = (
  prefix: string,
  target?: AllowedTypes,
  name: string = 'event'
): BaseFieldMetadata | undefined => {
  if (!target) {
    return undefined;
  }

  return getFieldMetadata({
    destinationName: name,
    type: `${name}_type`,
    fieldProps: {
      type: target,
    },
    prefix,
  });
};

const getObjectMetadata = (
  metadata: Pick<BaseFieldMetadata, 'destinationName' | 'name'>,
  payloadClass: ClassResource,
  prefix: string
): FieldMetadata => {
  const payloadMetadata = getMetadataByKey<PayloadMetadata>(
    payloadClass,
    createFieldName(prefix, FieldProperties.payload)
  ) || {
    name: payloadClass.name,
    id: payloadClass.name,
  };

  const properties = getMetadataPrototypeByKey<FieldMetadata[]>(
    payloadClass,
    createFieldName(prefix, FieldProperties.field)
  );

  if (!properties?.length) {
    throw new Error(`should include Field properties in ${payloadClass.name} class`);
  }

  return {
    ...metadata,
    properties,
    type: 'Object',
    payload: payloadMetadata,
  };
};

const getFieldMetadata = (props: GetFieldMetadataProps): FieldMetadata => {
  const { fieldProps, destinationName, type, prefix } = props;

  const metadata: Pick<BaseFieldMetadata, 'destinationName' | 'name'> = {
    destinationName,
    name: fieldProps?.name || destinationName,
  };

  let primitiveType = getPrimitiveType(type);

  if (!primitiveType && fieldProps?.type) {
    primitiveType = getPrimitiveType(fieldProps.type);
  }

  const typeHasValue = mapTypeofValueToPrimitiveType[typeof fieldProps?.type];

  if (fieldProps?.type !== undefined) {
    if (typeof fieldProps.type === 'function' && !primitiveType) {
      return getObjectMetadata(metadata, fieldProps.type as ClassResource, prefix);
    }

    if (Array.isArray(fieldProps.type)) {
      const arrayPrimitiveType = getPrimitiveType(fieldProps.type[0]);
      let items!: FieldMetadata;

      if (arrayPrimitiveType) {
        items = {
          type: arrayPrimitiveType,
          name: arrayPrimitiveType,
          destinationName: arrayPrimitiveType,
        };
      } else {
        if (typeof fieldProps.type[0] === 'function') {
          items = getObjectMetadata(
            {
              name: 'Object',
              destinationName: 'Object',
            },
            fieldProps.type[0] as ClassResource,
            prefix
          );
        }
      }

      return {
        ...metadata,
        type: 'Array',
        items,
      };
    }
  }

  if (
    primitiveTypeValues.has(type as PrimitiveTypes) ||
    primitiveTypeValues.has(primitiveType as PrimitiveTypes) ||
    typeHasValue
  ) {
    return {
      type: primitiveType || typeHasValue || (type as PrimitiveTypes),
      initialValue: typeHasValue ? (fieldProps?.type as any) : undefined,
      ...metadata,
    };
  }

  throw new Error(`unidentified type ${type} in ${destinationName} field`);
};

export const createFieldDecorator =
  <T extends FieldProps, M>({
    prefix,
    enableInLambdaInvocation,
    getMetadata,
  }: CreateFieldDecoratorProps<T, M>) =>
  (props?: T) =>
  (target: any, destinationName: string) => {
    if (!isBuildEnvironment() && !enableInLambdaInvocation) {
      return;
    }

    const filedKey = createFieldName(prefix, FieldProperties.field);

    const fields = getMetadataByKey<M & BaseFieldMetadata[]>(target, filedKey) || [];

    const propertyType = Reflect.getMetadata('design:type', target, destinationName).name;
    const parentMetadata = getMetadata(props);

    const metadata = [
      ...fields,
      {
        ...parentMetadata,
        ...getFieldMetadata({
          destinationName,
          type: propertyType,
          fieldProps: props,
          prefix,
        }),
      },
    ];
    Reflect.defineMetadata(filedKey, metadata, target);
  };

export const createFieldName = (prefix: string, type: FieldProperties) => {
  return `${prefix}:${type}`;
};
