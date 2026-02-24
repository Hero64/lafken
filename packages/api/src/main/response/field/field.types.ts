import type {
  ApiArrayMetadata,
  ApiBooleanMetadata,
  ApiNumberMetadata,
  ApiObjectMetadata,
  ApiStringMetadata,
} from '../../request';
import type { ResponseMetadata } from '../response.types';

export interface ResponseObjectMetadata
  extends Omit<ApiObjectMetadata, 'properties' | 'payload' | 'source'> {
  properties: ResponseFieldMetadata[];
  payload: ResponseMetadata;
}
export interface ResponseArrayField extends Omit<ApiArrayMetadata, 'items' | 'source'> {
  items: ResponseFieldMetadata;
}

export type ResponseFieldMetadata =
  | Omit<ApiStringMetadata, 'source'>
  | Omit<ApiNumberMetadata, 'source'>
  | Omit<ApiBooleanMetadata, 'source'>
  | ResponseObjectMetadata
  | ResponseArrayField;
