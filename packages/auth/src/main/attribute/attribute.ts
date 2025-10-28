import 'reflect-metadata';
import { createFieldDecorator, createPayloadDecorator } from '@alicanto/common';
import type {
  AuthAttributes,
  CommonStandardAttribute,
  CustomAttributeProps,
  CustomAttributesMetadata,
  StandardAttributeMetadata,
} from './attribute.types';

export const Attributes = createPayloadDecorator({
  createUniqueId: false,
});

/**
 * `@Standard`
 *
 * Decorator that create a attribute in cognito user pool.
 */
export const Custom =
  <T extends Record<A, number | string | boolean | Date>, A extends keyof T>(
    props: CustomAttributeProps<T[A]> = {} as CustomAttributeProps<T[A]>
  ) =>
  (target: T, propertyName: A) =>
    createFieldDecorator<CustomAttributeProps<T[A]>, CustomAttributesMetadata>({
      getMetadata: (props) => ({
        ...props,
        attributeType: 'custom',
        mutable: props?.mutable ?? true,
      }),
    })(props)(target, propertyName as string);

/**
 * `@Standard`
 *
 * Decorator that marks a property as a standard attribute supported by Cognito.
 *
 * This decorator can only be applied to the following attributes:
 * - `"email"`
 * - `"fullName"`
 * - `"nickname"`
 * - `"birthday"`
 * - `"lastName"`
 * - `"gender"`
 * - `"firstName"`
 * - `"lastUpdateTime"`
 * - `"locale"`
 * - `"middleName"`
 * - `"phoneNumber"`
 * - `"picture"`
 * - `"website"`
 */
export const Standard =
  (props: CommonStandardAttribute = {}) =>
  (target: any, propertyKey: keyof AuthAttributes) =>
    createFieldDecorator<CommonStandardAttribute, StandardAttributeMetadata>({
      getMetadata: (props) => ({
        attributeType: 'standard',
        mutable: props?.mutable ?? true,
        required: props?.required ?? true,
      }),
    })(props)(target, propertyKey as string);
