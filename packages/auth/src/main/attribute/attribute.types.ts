import type { FieldMetadata, FieldProps } from '@lafken/common';

/**
 * Metadata keys used internally to store Cognito attribute
 * information via `Reflect.defineMetadata`.
 */
export enum CognitoPropertyReflectKeys {
  custom = 'cognito:custom-attribute',
  standard = 'cognito:standard-attribute',
  PAYLOAD = 'cognito:payload',
}

/**
 * Base options shared by all custom Cognito attributes.
 */
interface CommonCustomAttribute extends Omit<FieldProps, 'type'> {
  /**
   * Whether the attribute value can be changed after the user is created.
   * Defaults to `true`.
   */
  mutable?: boolean;
  /**
   * The data type of the attribute. Accepted values are `String`,
   * `Number`, or `Boolean`.
   */
  type?: String | Number | Boolean;
}

/**
 * Options for a standard Cognito attribute.
 */
export interface CommonStandardAttribute extends Omit<CommonCustomAttribute, 'name'> {
  /**
   * Whether the attribute is required during user sign-up.
   * Defaults to `true`.
   */
  required?: boolean;
}

/**
 * Resolved metadata stored for a standard attribute after the
 * `@Standard` decorator is processed.
 */
export type StandardAttributeMetadata = Required<CommonStandardAttribute> &
  FieldMetadata & {
    attributeType: 'standard';
  };

/**
 * Options for a custom attribute whose property type is `number`.
 */
export interface NumberCustomAttribute extends CommonCustomAttribute {
  /** Minimum allowed value. */
  min?: number;
  /** Maximum allowed value. */
  max?: number;
}

/**
 * Options for a custom attribute whose property type is `string`.
 */
export interface StringCustomAttribute extends CommonCustomAttribute {
  /** Minimum string length. */
  minLen?: number;
  /** Maximum string length. */
  maxLen?: number;
}

export interface AuthAttributes {
  name?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  nickname?: string;
  preferredUsername?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: Date;
  zoneInfo?: string;
  locale?: string;
  updated_at?: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  sub?: string;
}

export type CustomAttributeProps<T> = T extends number
  ? NumberCustomAttribute
  : T extends string
    ? StringCustomAttribute
    : CommonCustomAttribute;

export type CustomAttributesMetadata = FieldMetadata & {
  attributeType: 'custom';
  mutable: boolean;
  min?: number;
  max?: number;
  minLen?: number;
  maxLen?: number;
};
