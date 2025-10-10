import type { FieldTypes } from '@alicanto/common';
import type { ApiParamMetadata } from '../../../../../main';

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
  templateOptions?: Omit<GenerateTemplateProps, 'fieldParams'>;
  // resolveValue: (value: any) => ProxyValueResolver;
  parseObjectValue?: (
    value: string,
    fieldType: FieldTypes,
    isRoot: boolean,
    isField: boolean
  ) => string;
}
