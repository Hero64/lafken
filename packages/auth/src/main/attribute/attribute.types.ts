import type { FieldMetadata, FieldProps } from '@alicanto/common';

export enum CognitoPropertyReflectKeys {
  custom = 'cognito:custom-attribute',
  standard = 'cognito:standard-attribute',
  PAYLOAD = 'cognito:payload',
}

interface CommonCustomAttribute extends Omit<FieldProps, 'type'> {
  mutable?: boolean;
  type?: String | Number | Boolean;
}

export interface CommonStandardAttribute extends Omit<CommonCustomAttribute, 'name'> {
  required?: boolean;
}

export type StandardAttributeMetadata = Required<CommonStandardAttribute> &
  FieldMetadata & {
    attributeType: 'standard';
  };

export interface NumberCustomAttribute extends CommonCustomAttribute {
  min?: number;
  max?: number;
}

export interface StringCustomAttribute extends CommonCustomAttribute {
  minLen?: number;
  maxLen?: number;
}

export interface AuthAttributes {
  address?: string;
  birthdate?: Date;
  email?: string;
  familyName?: string;
  fullname?: string;
  gender?: string;
  givenName?: string;
  lastUpdateTime?: string;
  locale?: string;
  middleName?: string;
  nickname?: string;
  phoneNumber?: string;
  preferredUsername?: string;
  profilePage?: string;
  profilePicture?: string;
  timezone?: string;
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
