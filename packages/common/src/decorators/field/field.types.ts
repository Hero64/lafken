import type { PayloadMetadata } from '../payload';

export type BasicTypes = StringConstructor | NumberConstructor | BooleanConstructor;

export type AllowedTypes =
  | String
  | Number
  | Boolean
  | Function
  | [String | Number | Boolean | Function];

export type AllowedTypesWithoutFunction = BasicTypes | [BasicTypes];

export type EnumValue = (string | number)[];

export interface FieldProps {
  /**
   * Original field name.
   *
   * Specifies the original name of the field as it is expected
   * in the input or payload. This is used to map incoming data
   * to the corresponding property in the system.
   */
  name?: string;
  /**
   * Field data type.
   *
   * Specifies the type of the field. By default, the type is inferred
   * from the property that decorates the field. However, it can be
   * explicitly set to a primitive type such as `String`, `Number`,
   * `Boolean`, or to another payload type.
   *
   * This ensures correct parsing, validation, and serialization of the field's value.
   */
  type?: AllowedTypes;
}
export interface BaseFieldMetadata {
  name: string;
  destinationName: string;
}
export interface StringField extends BaseFieldMetadata {
  type: 'String';
}
export interface NumberField extends BaseFieldMetadata {
  type: 'Number';
}
export interface BooleanField extends BaseFieldMetadata {
  type: 'Boolean';
}
export interface ObjectField extends BaseFieldMetadata {
  type: 'Object';
  properties: FieldMetadata[];
  payload: PayloadMetadata;
}
export interface ArrayField extends BaseFieldMetadata {
  type: 'Array';
  items: FieldMetadata;
}

export type FieldMetadata =
  | StringField
  | NumberField
  | BooleanField
  | ObjectField
  | ArrayField;

export type FieldTypes = FieldMetadata['type'];
export type PrimitiveTypes = Extract<FieldTypes, 'String' | 'Number' | 'Boolean'>;

export enum FieldProperties {
  field = 'alicanto:field',
  payload = 'alicanto:payload',
}

export interface CreateFieldDecoratorProps<P extends FieldProps, M> {
  enableInLambdaInvocation?: boolean;
  getMetadata: (props?: P) => Omit<M, keyof FieldMetadata>;
}

export interface GetFieldMetadataProps {
  type: string;
  destinationName: string;
  fieldProps?: FieldProps;
}
