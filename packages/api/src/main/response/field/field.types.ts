import type {
  ApiAnyMetadata,
  ApiArrayMetadata,
  ApiBooleanMetadata,
  ApiNumberMetadata,
  ApiObjectMetadata,
  ApiStringMetadata,
} from '../../request';
import type { ResponseMetadata } from '../response.types';

export interface ResponseObjectMetadata
  extends Omit<ApiObjectMetadata, 'properties' | 'payload' | 'source'> {
  template?: string;
  properties: ResponseFieldMetadata[];
  payload: ResponseMetadata<any>;
}
export interface ResponseArrayField extends Omit<ApiArrayMetadata, 'items' | 'source'> {
  template?: string;
  items: ResponseFieldMetadata;
}

export type ResponseFieldMetadata =
  | (Omit<ApiStringMetadata, 'source'> & { template?: string })
  | (Omit<ApiNumberMetadata, 'source'> & { template?: string })
  | (Omit<ApiBooleanMetadata, 'source'> & { template?: string })
  | (Omit<ApiAnyMetadata, 'source'> & { template?: string })
  | ResponseObjectMetadata
  | ResponseArrayField;
