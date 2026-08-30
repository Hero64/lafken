import { createFieldDecorator } from '@lafken/common';

import type { BodyParamProps } from '../../request';
import { RESOURCE_TYPE } from '../../type/type';
import type { ResponseFieldMetadata } from './field.types';

export const RESPONSE_PREFIX = `${RESOURCE_TYPE}_RESPONSE` as const;

/**
 * Property decorator that marks a class field as an API response field.
 *
 * Use it inside an `@ApiResponse` or `@ResponseObject` class to declare
 * each property that should appear in the response body. The decorator
 * supports the same type-specific constraints as `@BodyParam` (e.g.
 * `minLength`, `min`, `enum`), plus an optional `template` for injecting
 * raw Velocity template expressions into the response mapping.
 *
 * @typeParam T - The class type that owns the decorated property.
 * @typeParam P - The property key being decorated.
 * @param props - Optional field configuration (type, constraints, template).
 *
 * @example
 * ```ts
 * @ApiResponse()
 * export class UserResponse {
 *   @ResField()
 *   name: string;
 *
 *   @ResField({ template: "$input.json('$.email')" })
 *   email: string;
 * }
 * ```
 */
export const ResField =
  <T, P extends keyof T>(props?: BodyParamProps<T[P]> & { template?: string }) =>
  (target: T, destination: P): void => {
    createFieldDecorator<
      BodyParamProps<T[P]> & { template?: string },
      ResponseFieldMetadata
    >({
      prefix: RESPONSE_PREFIX,
      getMetadata: (props) => {
        return {
          ...props,
          required: props?.required ?? true,
        };
      },
    })(props)(target, destination as string);
  };
