import 'reflect-metadata';
import {
  createFieldDecorator,
  createFieldName,
  createPayloadDecorator,
  FieldProperties,
} from '@lafken/common';
import { RESOURCE_TYPE } from '../extension/extension';
import type {
  AuthAttributes,
  CommonStandardAttribute,
  CustomAttributeProps,
  CustomAttributesMetadata,
  StandardAttributeMetadata,
} from './attribute.types';

export const authFieldKey = createFieldName(RESOURCE_TYPE, FieldProperties.field);
export const authPayloadKey = createFieldName(RESOURCE_TYPE, FieldProperties.payload);

/**
 * Class decorator that declares a class as a Cognito User Pool
 * attributes definition.
 *
 * The decorated class groups standard and custom attributes that will
 * be configured on the Cognito User Pool. Use `@Standard` and `@Custom`
 * on its properties to describe each attribute.
 *
 * @param props - Optional payload configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @Attributes()
 * export class UserAttributes {
 *   @Standard({ required: true })
 *   email: string;
 *
 *   @Custom({ minLen: 2, maxLen: 50 })
 *   displayName: string;
 * }
 * ```
 */
export const Attributes = createPayloadDecorator({
  prefix: RESOURCE_TYPE,
  createUniqueId: false,
});

/**
 * Property decorator that registers a custom attribute on the Cognito
 * User Pool.
 *
 * Custom attributes are user-defined fields that extend the default
 * Cognito schema. The decorator options are resolved based on the
 * property type: string fields accept `minLen` / `maxLen`, number fields
 * accept `min` / `max`, and all types support `mutable`.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @typeParam A - The property key being decorated.
 * @param props - Optional type-specific constraints for the attribute.
 *
 * @example
 * ```ts
 * @Attributes()
 * export class UserAttributes {
 *   @Custom({ minLen: 2, maxLen: 100 })
 *   displayName: string;
 *
 *   @Custom({ min: 0, max: 200 })
 *   score: number;
 *
 *   @Custom({ mutable: false })
 *   isVerified: boolean;
 * }
 * ```
 */
export const Custom =
  <T extends Record<A, number | string | boolean | Date>, A extends keyof T>(
    props: CustomAttributeProps<T[A]> = {} as CustomAttributeProps<T[A]>
  ) =>
  (target: T, propertyName: A) =>
    createFieldDecorator<CustomAttributeProps<T[A]>, CustomAttributesMetadata>({
      prefix: RESOURCE_TYPE,
      getMetadata: (props) => ({
        ...props,
        attributeType: 'custom',
        mutable: props?.mutable ?? true,
      }),
    })(props)(target, propertyName as string);

/**
 * Property decorator that marks a field as a standard Cognito User Pool
 * attribute.
 *
 * Standard attributes are predefined by Cognito and follow the OpenID
 * Connect specification. The property name must match one of the
 * supported attribute keys:
 *
 * `name`, `familyName`, `givenName`, `middleName`, `nickname`,
 * `preferredUsername`, `profile`, `picture`, `website`, `gender`,
 * `birthdate`, `zoneInfo`, `locale`, `updated_at`, `address`,
 * `email`, `phoneNumber`, `sub`.
 *
 * @param props - Optional settings for the attribute.
 * @param props.required - Whether the attribute is required during sign-up. Defaults to `true`.
 * @param props.mutable - Whether the attribute value can be changed after creation. Defaults to `true`.
 *
 * @example
 * ```ts
 * @Attributes()
 * export class UserAttributes {
 *   @Standard({ required: true })
 *   email: string;
 *
 *   @Standard({ required: false, mutable: true })
 *   nickname: string;
 * }
 * ```
 */
export const Standard =
  (props: CommonStandardAttribute = {}) =>
  (target: any, propertyKey: keyof AuthAttributes) =>
    createFieldDecorator<CommonStandardAttribute, StandardAttributeMetadata>({
      prefix: RESOURCE_TYPE,
      getMetadata: (props) => ({
        attributeType: 'standard',
        mutable: props?.mutable ?? true,
        required: props?.required ?? true,
      }),
    })(props)(target, propertyKey as string);
