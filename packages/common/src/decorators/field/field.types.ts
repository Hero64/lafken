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
  initialValue?: string;
}
export interface NumberField extends BaseFieldMetadata {
  type: 'Number';
  initialValue?: number;
}
export interface BooleanField extends BaseFieldMetadata {
  type: 'Boolean';
  initialValue?: boolean;
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

export interface AnyField extends BaseFieldMetadata {
  type: 'Any';
}

export type FieldMetadata =
  | StringField
  | NumberField
  | BooleanField
  | ObjectField
  | ArrayField
  | AnyField;

export type FieldTypes = FieldMetadata['type'];
export type PrimitiveTypes = Extract<FieldTypes, 'String' | 'Number' | 'Boolean'>;

export enum FieldProperties {
  field = 'lafken:field',
  payload = 'lafken:payload',
}

export interface CreateFieldDecoratorProps<P extends FieldProps, M> {
  prefix: string;
  enableInLambdaInvocation?: boolean;
  getMetadata: (props?: P) => Omit<M, keyof FieldMetadata> & { forceType?: any };
}

export interface GetFieldMetadataProps {
  type: string;
  prefix: string;
  destinationName: string;
  fieldProps?: FieldProps;
}
