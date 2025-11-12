import type { FieldTypes } from '@alicanto/common';
import type { ProxyValueResolver } from '../proxy/proxy.types';
import type {
  GenerateTemplateByObjectProps,
  GenerateTemplateProps,
  TemplateParam,
} from './template.types';
import {
  PRIMITIVE_TYPES,
  requestTemplateMap,
  TEMPLATE_KEY_REPLACE,
} from './template.utils';

export class TemplateHelper {
  public generateTemplate(
    {
      field,
      currentValue = '',
      quoteType = '"',
      valueParser = (value) => value,
      propertyWrapper = (template) => template,
    }: GenerateTemplateProps,
    index = 0
  ): string {
    const value =
      index === 0
        ? requestTemplateMap[field.source || 'body'](currentValue, field.type)
        : currentValue;

    if (field.type === 'Array') {
      const forVariableName = `$item${index}`;
      const start = `#foreach(${forVariableName} in ${value})`;
      const end = '#if($foreach.hasNext),#end #end';
      const content =
        field.items.type === 'Object'
          ? this.generateTemplate(
              {
                field: field.items,
                currentValue: forVariableName,
                quoteType,
                valueParser,
              },
              index + 1
            )
          : forVariableName;

      return `[${start} ${content} ${end}]`;
    }

    if (field.type === 'Object') {
      let template = '';
      for (const property of field.properties) {
        const value = `${currentValue ? `${currentValue}.` : ''}${property.name}`;
        const key = `${quoteType}${property.destinationName}${quoteType}`;
        const fieldTemplate = this.generateTemplate(
          {
            field: {
              ...property,
              source: field.source || property.source,
            },
            currentValue: value,
            quoteType,
            valueParser,
            propertyWrapper,
          },
          index
        );

        const objectTemplate = `$comma${key}: ${propertyWrapper(fieldTemplate, property)} #set($comma = ",")`;
        template += this.validateTemplateArgument(
          [value],
          {
            ...field,
            source: field.source || property.source || 'body',
            validation: property.validation,
          },
          objectTemplate,
          index === 0
        );
      }

      return `{ #set($comma = "") ${template} }`;
    }

    if (field.type === 'String') {
      const quoteTypeValue = field.source === 'body' ? '' : quoteType;
      const template = `${quoteTypeValue}${value}${quoteTypeValue}`;
      return valueParser(field.directTemplateValue || template, field.type);
    }

    return valueParser(field.directTemplateValue || value, field.type);
  }

  validateTemplateArgument(
    argumentNames: string[],
    field: TemplateParam,
    template: string,
    checkSource: boolean
  ) {
    if (field.validation?.required === false) {
      const totalItems = argumentNames.length - 1;
      const lastValue = argumentNames[totalItems];
      let validationTemplate = '';

      const sourceType = checkSource
        ? requestTemplateMap[field.source || 'body'](TEMPLATE_KEY_REPLACE, field.type)
        : TEMPLATE_KEY_REPLACE;

      for (let i = 0; i < argumentNames.length; i++) {
        const argument = argumentNames[i];
        const expression = i < totalItems ? ' && ' : '';
        const value = sourceType.replace(TEMPLATE_KEY_REPLACE, argument);

        validationTemplate += `${value}${expression}`;
      }

      if (field.type === 'Array') {
        validationTemplate += ` && ${sourceType.replace(TEMPLATE_KEY_REPLACE, lastValue)}.size() > 0`;
      }

      validationTemplate = `#if(${validationTemplate}) ${field.directTemplateValue || template} #end`;
      return validationTemplate;
    }

    return template;
  }

  generateTemplateByObject(
    {
      value,
      quoteType = '"',
      resolveValue,
      parseObjectValue = (template: string) => template,
      templateOptions = {},
    }: GenerateTemplateByObjectProps,
    isRoot = true
  ) {
    const { field, path, type } = resolveValue(value);

    if (field) {
      const fieldTemplate = this.generateTemplate({
        field: field,
        currentValue: path,
        quoteType,
        ...templateOptions,
      });

      return parseObjectValue(fieldTemplate, type, isRoot, true);
    }

    if (PRIMITIVE_TYPES.has(type)) {
      return parseObjectValue(
        type === 'String' ? `${quoteType}${value}${quoteType}` : value,
        type,
        isRoot,
        false
      );
    }

    let template = '';
    let comma = '';
    if (type === 'Object') {
      for (const objectKey in value) {
        const fieldTemplate = this.generateTemplateByObject(
          {
            value: value[objectKey],
            quoteType,
            resolveValue,
            parseObjectValue,
            templateOptions,
          },
          false
        );
        template += `${comma}${quoteType}${objectKey}${quoteType}: ${fieldTemplate}`;
        comma = ',';
      }
      template = `{ ${template} }`;

      return parseObjectValue(template, type, isRoot, false);
    }

    for (const itemValue of value) {
      const fieldTemplate = this.generateTemplateByObject(
        {
          value: itemValue,
          quoteType,
          resolveValue,
          parseObjectValue,
          templateOptions,
        },
        false
      );
      template += `${comma}${fieldTemplate}`;
      comma = ',';
    }
    template = `[${template}]`;

    return parseObjectValue(template, type, isRoot, false);
  }

  getTemplateFromProxyValue(resolver: ProxyValueResolver, quoteType = '"') {
    if (resolver.field) {
      return this.generateTemplate({
        field: resolver.field,
        currentValue: resolver.path,
        quoteType,
      });
    }

    if (typeof resolver.value === 'string') {
      return `${quoteType}${resolver.value}${quoteType}`;
    }

    return resolver.value;
  }

  scapeJavascriptValue(value: string, type: FieldTypes) {
    return type === 'String' ? `$util.escapeJavaScript(${value})` : value;
  }
}
