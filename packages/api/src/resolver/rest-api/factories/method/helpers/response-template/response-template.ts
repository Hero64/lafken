import type {
  ResponseArrayField,
  ResponseFieldMetadata,
  ResponseObjectMetadata,
} from '../../../../../../main';
import { TemplateHelper } from '../template/template';
import type { TemplateParam } from '../template/template.types';

export class ResponseTemplateHelper {
  private readonly templateHelper = new TemplateHelper();

  buildTemplate(response: ResponseObjectMetadata | ResponseArrayField): string {
    const param = this.toTemplateParam(response);
    return this.templateHelper.generateTemplate({ field: param, currentValue: '' });
  }

  private toTemplateParam(field: ResponseFieldMetadata): TemplateParam {
    const base = {
      name: field.name,
      destinationName: field.destinationName,
      required: field.required,
      source: 'body' as const,
      directTemplateValue: field.template,
    };

    if (field.type === 'Object') {
      return {
        ...base,
        type: 'Object',
        properties: field.properties.map((p) => this.toTemplateParam(p)),
      } as unknown as TemplateParam;
    }

    if (field.type === 'Array') {
      return {
        ...base,
        type: 'Array',
        items: this.toTemplateParam(field.items),
      } as unknown as TemplateParam;
    }

    const directTemplateValue =
      field.template != null && field.type === 'String'
        ? `"${field.template}"`
        : field.template;

    return { ...base, directTemplateValue, type: field.type } as unknown as TemplateParam;
  }
}
