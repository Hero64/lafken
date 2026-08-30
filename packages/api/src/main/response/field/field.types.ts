import type {
  ApiAnyMetadata,
  ApiArrayMetadata,
  ApiBooleanMetadata,
  ApiNumberMetadata,
  ApiObjectMetadata,
  ApiStringMetadata,
} from '../../request';
import type { ResponseMetadata } from '../response.types';

/**
 * Resolved metadata for an object-typed API response field.
 * Contains the nested response properties and an optional Velocity template
 * expression used to transform the response payload.
 */
export interface ResponseObjectMetadata
  extends Omit<ApiObjectMetadata, 'properties' | 'payload' | 'source'> {
  /** Velocity template expression applied to this field's value. */
  template?: string;
  /** Nested field definitions for each property of the response object. */
  properties: ResponseFieldMetadata[];
  /** Payload metadata describing the full response body schema. */
  payload: ResponseMetadata<any>;
}
/**
 * Resolved metadata for an array-typed API response field.
 * Wraps a single {@link ResponseFieldMetadata} that describes the schema
 * of each array element.
 */
export interface ResponseArrayField extends Omit<ApiArrayMetadata, 'items' | 'source'> {
  /** Velocity template expression applied to this field's value. */
  template?: string;
  /** Schema definition for the items contained in the response array. */
  items: ResponseFieldMetadata;
}

/**
 * Union of all resolved response field metadata types.
 * Each variant corresponds to a primitive, object, or array response field
 * with an optional Velocity template expression.
 */
export type ResponseFieldMetadata =
  | (Omit<ApiStringMetadata, 'source'> & { template?: string })
  | (Omit<ApiNumberMetadata, 'source'> & { template?: string })
  | (Omit<ApiBooleanMetadata, 'source'> & { template?: string })
  | (Omit<ApiAnyMetadata, 'source'> & { template?: string })
  | ResponseObjectMetadata
  | ResponseArrayField;
