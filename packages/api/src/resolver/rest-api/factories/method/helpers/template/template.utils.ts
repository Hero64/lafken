import type { FieldTypes } from '@alicanto/common';
import type { Source } from '../../../../../../main';

export const TEMPLATE_KEY_REPLACE = '{{key}}';
export const PRIMITIVE_TYPES = new Set<FieldTypes>(['Boolean', 'Number', 'String']);

export const requestTemplateMap: Record<
  Source,
  (key: string, type?: FieldTypes) => string
> = {
  body: (key) => `$input.json('$.${key}')`,
  path: (key) => `$input.params().path.get('${key}')`,
  query: (key, type) =>
    type !== 'Array'
      ? `$input.params('${key}')`
      : `$method.request.multivaluequerystring.get('${key}')`,
  header: (key) => `$input.params().header.get('${key}')`,
  context: (key) => `$content.${key}`,
};
