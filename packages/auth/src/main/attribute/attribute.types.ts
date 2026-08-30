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

/**
 * Standard Cognito user attributes.
 *
 * Represents the built-in Cognito User Pool attributes available on
 * a user object. These are commonly used when creating or updating
 * user profiles, or when mapping Cognito claims to application-level data.
 */
export interface AuthAttributes {
  /** Full name of the user. */
  name?: string;
  /** Family name (last name) of the user. */
  familyName?: string;
  /** Given name (first name) of the user. */
  givenName?: string;
  /** Middle name of the user. */
  middleName?: string;
  /** Nickname for the user. */
  nickname?: string;
  /** Preferred username displayed in the user pool. */
  preferredUsername?: string;
  /** URL of the user's profile page. */
  profile?: string;
  /** URL of the user's profile image. */
  picture?: string;
  /** URL of the user's personal website. */
  website?: string;
  /** Gender of the user (e.g. `'male'`, `'female'`, `'other'`). */
  gender?: string;
  /** User's date of birth. */
  birthdate?: Date;
  /** IANA time zone of the user (e.g. `'America/Los_Angeles'`). */
  zoneInfo?: string;
  /** Locale of the user (e.g. `'en-US'`). */
  locale?: string;
  /** ISO 8601 timestamp when the user's profile was last updated. */
  updated_at?: string;
  /** Physical address of the user. */
  address?: string;
  /** Verified email address of the user. */
  email?: string;
  /** Verified phone number of the user. */
  phoneNumber?: string;
  /** Unique identifier for the Cognito user (immutable). */
  sub?: string;
}

export type CustomAttributeProps<T> = T extends number
  ? NumberCustomAttribute
  : T extends string
    ? StringCustomAttribute
    : CommonCustomAttribute;

/**
 * Resolved metadata for a custom Cognito attribute after the `@Custom`
 * decorator is processed. Includes validation constraints derived from
 * the attribute's TypeScript type.
 */
export type CustomAttributesMetadata = FieldMetadata & {
  /** Discriminant indicating this is a custom attribute. */
  attributeType: 'custom';
  /** Whether the attribute value can be changed after creation. */
  mutable: boolean;
  /** Minimum numeric value (for `Number`-typed attributes). */
  min?: number;
  /** Maximum numeric value (for `Number`-typed attributes). */
  max?: number;
  /** Minimum string length (for `String`-typed attributes). */
  minLen?: number;
  /** Maximum string length (for `String`-typed attributes). */
  maxLen?: number;
};
