import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateHelper } from './template';

describe('TemplateHelper', () => {
  let templateHelper: TemplateHelper;

  beforeEach(() => {
    templateHelper = new TemplateHelper();
  });

  describe('generateTemplate', () => {
    describe('String type handling', () => {
      it('should generate template for string field from body source', () => {
        const field = {
          type: 'String' as const,
          name: 'username',
          destinationName: 'username',
          source: 'body' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'username',
        } as any);

        expect(result).toBe('"$input.path(\'$.username\')"');
      });

      it('should generate template for string field from path source with quotes', () => {
        const field = {
          type: 'String' as const,
          name: 'id',
          destinationName: 'id',
          source: 'path' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'id',
        } as any);

        expect(result).toBe('"$input.params().path.get(\'id\')"');
      });

      it('should generate template for string field from query source', () => {
        const field = {
          type: 'String' as const,
          name: 'filter',
          destinationName: 'filter',
          source: 'query' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'filter',
        } as any);

        expect(result).toBe('"$input.params(\'filter\')"');
      });

      it('should generate template for string field from header source', () => {
        const field = {
          type: 'String' as const,
          name: 'authorization',
          destinationName: 'authorization',
          source: 'header' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'authorization',
        } as any);

        expect(result).toBe('"$input.params().header.get(\'authorization\')"');
      });

      it('should use directTemplateValue when provided', () => {
        const field = {
          type: 'String' as const,
          name: 'custom',
          destinationName: 'custom',
          source: 'body' as const,
          validation: {},
          directTemplateValue: '$custom.value',
        };

        const result = templateHelper.generateTemplate({ field } as any);

        expect(result).toBe('$custom.value');
      });

      it('should use custom quote type', () => {
        const field = {
          type: 'String' as const,
          name: 'name',
          destinationName: 'name',
          source: 'path' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'name',
          quoteType: "'",
        } as any);

        expect(result).toBe("'$input.params().path.get('name')'");
      });
    });

    describe('Number and Boolean type handling', () => {
      it('should generate template for number field', () => {
        const field = {
          type: 'Number' as const,
          name: 'age',
          destinationName: 'age',
          source: 'body' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'age',
        } as any);

        expect(result).toBe("$input.path('$.age')");
      });

      it('should generate template for boolean field', () => {
        const field = {
          type: 'Boolean' as const,
          name: 'active',
          destinationName: 'active',
          source: 'body' as const,
          validation: {},
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'active',
        } as any);

        expect(result).toBe("$input.path('$.active')");
      });
    });

    describe('Object type handling', () => {
      it('should generate template for simple object', () => {
        const field = {
          type: 'Object' as const,
          name: 'user',
          destinationName: 'user',
          source: 'body' as const,
          validation: {},
          properties: [
            {
              type: 'String' as const,
              name: 'name',
              destinationName: 'name',
              source: 'body' as const,
              validation: {},
            },
          ],
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'user',
        } as any);

        expect(result).toContain('{ #set($comma = "")');
        expect(result).toContain('"name": "$input.path(\'$.user.name\')"');
        expect(result).toContain('#set($comma = ",")');
        expect(result).toContain('}');
      });

      it('should handle empty object properties', () => {
        const field = {
          type: 'Object' as const,
          name: 'empty',
          destinationName: 'empty',
          source: 'body' as const,
          validation: {},
          properties: [],
        };

        const result = templateHelper.generateTemplate({ field } as any);

        expect(result).toBe('{ #set($comma = "")  }');
      });
    });

    describe('Array type handling', () => {
      it('should generate template for array of strings', () => {
        const field = {
          type: 'Array' as const,
          name: 'tags',
          destinationName: 'tags',
          source: 'body' as const,
          validation: {},
          items: {
            type: 'String' as const,
            name: 'tag',
            destinationName: 'tag',
            source: 'body' as const,
            validation: {},
          },
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'tags',
        } as any);

        expect(result).toBe(
          "[#foreach($item0 in $input.path('$.tags')) $item0 #if($foreach.hasNext),#end #end]"
        );
      });

      it('should generate template for array of objects', () => {
        const field = {
          type: 'Array' as const,
          name: 'users',
          destinationName: 'users',
          source: 'body' as const,
          validation: {},
          items: {
            type: 'Object' as const,
            name: 'user',
            destinationName: 'user',
            source: 'body' as const,
            validation: {},
            properties: [
              {
                type: 'String' as const,
                name: 'name',
                destinationName: 'name',
                source: 'body' as const,
                validation: {},
              },
            ],
          },
        };

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'users',
        } as any);

        expect(result).toContain("[#foreach($item0 in $input.path('$.users'))");
        expect(result).toContain('{ #set($comma = "")');
        expect(result).toContain('"name": "$item0.name"');
        expect(result).toContain('#if($foreach.hasNext),#end #end]');
      });
    });

    describe('Custom parsers and wrappers', () => {
      it('should apply custom value parser', () => {
        const field = {
          type: 'String' as const,
          name: 'test',
          destinationName: 'test',
          source: 'body' as const,
          validation: {},
        };

        const valueParser = vi.fn((value: string) => `PARSED(${value})`);

        const result = templateHelper.generateTemplate({
          field,
          currentValue: 'test',
          valueParser,
        } as any);

        expect(valueParser).toHaveBeenCalledWith('"$input.path(\'$.test\')"', 'String');
        expect(result).toBe('PARSED("$input.path(\'$.test\')")');
      });
    });
  });

  describe('validateTemplateArgument', () => {
    it('should return template as-is when validation.required is not false', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        source: 'body' as const,
        validation: { required: true },
      };

      const result = templateHelper.validateTemplateArgument(
        ['test'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe('TEMPLATE_CONTENT');
    });

    it('should wrap template with validation when required is false', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        source: 'body' as const,
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['test'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe("#if($input.path('$.test')) TEMPLATE_CONTENT #end");
    });

    it('should handle multiple arguments with AND conditions', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        source: 'body' as const,
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['arg1', 'arg2', 'arg3'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe(
        "#if($input.path('$.arg1') && $input.path('$.arg2') && $input.path('$.arg3')) TEMPLATE_CONTENT #end"
      );
    });

    it('should add size check for array fields', () => {
      const field = {
        type: 'Array' as const,
        name: 'items',
        destinationName: 'items',
        source: 'body' as const,
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['items'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe(
        "#if($input.path('$.items') && $input.path('$.items').size() > 0) TEMPLATE_CONTENT #end"
      );
    });

    it('should use simple key replacement when checkSource is false', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        source: 'body' as const,
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['test'],
        field as any,
        'TEMPLATE_CONTENT',
        false
      );

      expect(result).toBe('#if(test) TEMPLATE_CONTENT #end');
    });

    it('should handle different source types in validation', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        source: 'path' as const,
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['test'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe("#if($input.params().path.get('test')) TEMPLATE_CONTENT #end");
    });

    it('should default to body source when no source specified', () => {
      const field = {
        type: 'String' as const,
        name: 'test',
        destinationName: 'test',
        validation: { required: false },
      };

      const result = templateHelper.validateTemplateArgument(
        ['test'],
        field as any,
        'TEMPLATE_CONTENT',
        true
      );

      expect(result).toBe("#if($input.path('$.test')) TEMPLATE_CONTENT #end");
    });
  });
});
