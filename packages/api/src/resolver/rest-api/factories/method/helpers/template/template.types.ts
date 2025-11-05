import type { FieldTypes } from '@alicanto/common';
import type { ApiParamMetadata } from '../../../../../../main';
import type { ProxyValueResolver } from '../proxy/proxy.types';

export type TemplateParam = ApiParamMetadata & {
  directTemplateValue?: string;
};

export interface GenerateTemplateProps {
  field: TemplateParam;
  quoteType?: string;
  currentValue?: string;
  valueParser?: (value: string, fieldType: FieldTypes, isRoot?: boolean) => string;
  propertyWrapper?: (template: string, param: TemplateParam) => string;
}

export interface GenerateTemplateByObjectProps {
  value: any;
  quoteType?: string;
  templateOptions?: Omit<GenerateTemplateProps, 'field'>;
  resolveValue: (value: any) => ProxyValueResolver;
  parseObjectValue?: (
    value: string,
    fieldType: FieldTypes,
    isRoot: boolean,
    isField: boolean
  ) => string;
}
