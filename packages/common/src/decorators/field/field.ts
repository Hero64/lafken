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

export const getPrimitiveType = (type: AllowedTypes): PrimitiveTypes | undefined => {
  if (type === String) return 'String';
  if (type === Number) return 'Number';
  if (type === Boolean) return 'Boolean';
};

export const getEventFields = (
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
  });
};

const getObjectMetadata = (
  metadata: Pick<BaseFieldMetadata, 'destinationName' | 'name'>,
  payloadClass: ClassResource
): FieldMetadata => {
  const payloadMetadata = getMetadataByKey<PayloadMetadata>(
    payloadClass,
    FieldProperties.payload
  );

  if (!payloadMetadata) {
    throw new Error('Field should be decorated by @Payload decorator');
  }

  return {
    ...metadata,
    type: 'Object',
    properties: getMetadataPrototypeByKey<FieldMetadata[]>(
      payloadClass,
      FieldProperties.field
    ),
    payload: payloadMetadata,
  };
};

const getFieldMetadata = (props: GetFieldMetadataProps): FieldMetadata => {
  const { fieldProps, destinationName, type } = props;

  const metadata: Pick<BaseFieldMetadata, 'destinationName' | 'name'> = {
    destinationName,
    name: fieldProps?.name || destinationName,
  };

  const primitiveType = getPrimitiveType(type);

  if (
    primitiveTypeValues.has(type as PrimitiveTypes) ||
    primitiveTypeValues.has(primitiveType as PrimitiveTypes)
  ) {
    return {
      type: primitiveType || (type as PrimitiveTypes),
      ...metadata,
    };
  }

  if (fieldProps?.type !== undefined) {
    if (typeof fieldProps.type === 'function') {
      return getObjectMetadata(metadata, fieldProps.type as ClassResource);
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
            fieldProps.type[0] as ClassResource
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

  throw new Error(`unidentified type ${type} in ${destinationName} field`);
};

export const createFieldDecorator =
  <T extends FieldProps, M>({
    getMetadata,
    enableInLambdaInvocation,
  }: CreateFieldDecoratorProps<T, M>) =>
  (props?: T) =>
  (target: any, destinationName: string) => {
    if (!isBuildEnvironment() && !enableInLambdaInvocation) {
      return;
    }

    const fields =
      getMetadataByKey<M & BaseFieldMetadata[]>(target, FieldProperties.field) || [];

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
        }),
      },
    ];
    Reflect.defineMetadata(FieldProperties.field, metadata, target);
  };
