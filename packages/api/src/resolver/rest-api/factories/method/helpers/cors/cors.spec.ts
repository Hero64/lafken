import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import type { CorsOptions } from '../../../../../resolver.types';
import { setupInternalTestingRestApi } from '../../../../../utils/testing.utils';
import { CorsHelper } from './cors';

describe('CorsHelper', () => {
  describe('buildHeaders', () => {
    const corsHelper = new CorsHelper();

    it('should set allow origin to * when allowOrigins is undefined', () => {
      const headers = corsHelper.buildHeaders({});
      expect(headers['method.response.header.Access-Control-Allow-Origin']).toBe("'*'");
    });

    it('should set allow origin to * when allowOrigins is true', () => {
      const headers = corsHelper.buildHeaders({ allowOrigins: true });
      expect(headers['method.response.header.Access-Control-Allow-Origin']).toBe("'*'");
    });

    it('should report cors as disabled when allowOrigins is false', () => {
      expect(corsHelper.isEnabled({ allowOrigins: false })).toBe(false);
      expect(corsHelper.isEnabled(undefined)).toBe(false);
      expect(corsHelper.isEnabled({ allowOrigins: true })).toBe(true);
      expect(corsHelper.isEnabled({})).toBe(true);
    });

    it('should set the specific origin string', () => {
      const headers = corsHelper.buildHeaders({
        allowOrigins: 'https://example.com',
      });
      expect(headers['method.response.header.Access-Control-Allow-Origin']).toBe(
        "'https://example.com'"
      );
    });

    it('should map the first origin of an array statically', () => {
      const headers = corsHelper.buildHeaders({
        allowOrigins: ['https://a.com', 'https://b.com'],
      });
      expect(headers['method.response.header.Access-Control-Allow-Origin']).toBe(
        "'https://a.com'"
      );
    });

    it('should set Vary to Origin for a specific origin', () => {
      const headers = corsHelper.buildHeaders({ allowOrigins: 'https://a.com' });
      expect(headers['method.response.header.Vary']).toBe("'Origin'");
    });

    it('should not set Vary when every origin is allowed', () => {
      const headers = corsHelper.buildHeaders({ allowOrigins: true });
      expect(headers['method.response.header.Vary']).toBeUndefined();
    });

    it('should reject an empty origin array', () => {
      expect(() => corsHelper.buildHeaders({ allowOrigins: [] })).toThrow(
        /at least one origin/
      );
    });

    it('should reject * mixed with specific origins', () => {
      expect(() =>
        corsHelper.buildHeaders({ allowOrigins: ['*', 'https://a.com'] })
      ).toThrow(/cannot mix/);
    });

    it('should reject a RegExp origin', () => {
      // A RegExp is no longer part of the type, so this only reaches a JS caller.
      expect(() =>
        corsHelper.buildHeaders({
          allowOrigins: /example\.com/,
        } as unknown as CorsOptions)
      ).toThrow(/RegExp/);
    });

    it('should reject * combined with credentials', () => {
      expect(() =>
        corsHelper.buildHeaders({ allowOrigins: true, allowCredentials: true })
      ).toThrow(/allowCredentials/);
    });

    it('should set default allowed methods when not provided', () => {
      const headers = corsHelper.buildHeaders({});
      expect(headers['method.response.header.Access-Control-Allow-Methods']).toBe(
        "'GET,HEAD,PUT,PATCH,POST,DELETE'"
      );
    });

    it('should set custom allowed methods', () => {
      const headers = corsHelper.buildHeaders({
        allowMethods: ['GET', 'POST'],
      });
      expect(headers['method.response.header.Access-Control-Allow-Methods']).toBe(
        "'GET,POST'"
      );
    });

    it('should set default allowed headers when not provided', () => {
      const headers = corsHelper.buildHeaders({});
      expect(headers['method.response.header.Access-Control-Allow-Headers']).toBe(
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
      );
    });

    it('should set * for allowed headers when true', () => {
      const headers = corsHelper.buildHeaders({ allowHeaders: true });
      expect(headers['method.response.header.Access-Control-Allow-Headers']).toBe("'*'");
    });

    it('should set empty for allowed headers when false', () => {
      const headers = corsHelper.buildHeaders({ allowHeaders: false });
      expect(headers['method.response.header.Access-Control-Allow-Headers']).toBe("''");
    });

    it('should set custom allowed headers', () => {
      const headers = corsHelper.buildHeaders({
        allowHeaders: ['X-Custom', 'Authorization'],
      });
      expect(headers['method.response.header.Access-Control-Allow-Headers']).toBe(
        "'X-Custom,Authorization'"
      );
    });

    it('should set expose headers when provided', () => {
      const headers = corsHelper.buildHeaders({
        exposeHeaders: ['X-Request-Id', 'X-Custom'],
      });
      expect(headers['method.response.header.Access-Control-Expose-Headers']).toBe(
        "'X-Request-Id,X-Custom'"
      );
    });

    it('should not set expose headers when empty', () => {
      const headers = corsHelper.buildHeaders({ exposeHeaders: [] });
      expect(
        headers['method.response.header.Access-Control-Expose-Headers']
      ).toBeUndefined();
    });

    it('should set allow credentials when true', () => {
      const headers = corsHelper.buildHeaders({
        allowOrigins: 'https://example.com',
        allowCredentials: true,
      });
      expect(headers['method.response.header.Access-Control-Allow-Credentials']).toBe(
        "'true'"
      );
    });

    it('should not set allow credentials when false', () => {
      const headers = corsHelper.buildHeaders({ allowCredentials: false });
      expect(
        headers['method.response.header.Access-Control-Allow-Credentials']
      ).toBeUndefined();
    });

    it('should set default max age of 86400', () => {
      const headers = corsHelper.buildHeaders({});
      expect(headers['method.response.header.Access-Control-Max-Age']).toBe("'86400'");
    });

    it('should set custom max age', () => {
      const headers = corsHelper.buildHeaders({ maxAge: 3600 });
      expect(headers['method.response.header.Access-Control-Max-Age']).toBe("'3600'");
    });
  });

  describe('buildOriginOverrideTemplate', () => {
    const corsHelper = new CorsHelper();

    it('should return undefined when there is a single origin', () => {
      expect(
        corsHelper.buildOriginOverrideTemplate({ allowOrigins: 'https://a.com' })
      ).toBeUndefined();
      expect(
        corsHelper.buildOriginOverrideTemplate({ allowOrigins: ['https://a.com'] })
      ).toBeUndefined();
      expect(
        corsHelper.buildOriginOverrideTemplate({ allowOrigins: true })
      ).toBeUndefined();
    });

    it('should match every origin past the first', () => {
      const template = corsHelper.buildOriginOverrideTemplate({
        allowOrigins: ['https://a.com', 'https://b.com', 'https://c.com'],
      });

      expect(template).toContain('$input.params().header.get("Origin")');
      expect(template).toContain(
        '#if($origin == "https://b.com" || $origin == "https://c.com")'
      );
      expect(template).toContain(
        '#set($context.responseOverride.header.Access-Control-Allow-Origin = $origin)'
      );
      // The first origin is already mapped statically, so matching it again
      // would override the same parameter twice and return a 5XX.
      expect(template).not.toContain('https://a.com');
    });
  });

  describe('createOptionsMethod', () => {
    it('should create OPTIONS method, integration, method response, and integration response', () => {
      const { restApi, stack } = setupInternalTestingRestApi();

      const corsHelper = new CorsHelper();
      const cors: CorsOptions = { allowOrigins: true };

      const resources = corsHelper.createOptionsMethod(
        restApi,
        'test-method',
        'resource-id',
        cors
      );

      expect(resources).toHaveLength(4);

      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethod, {
        http_method: 'OPTIONS',
        authorization: 'NONE',
      });

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
        type: 'MOCK',
        request_templates: {
          'application/json': '{"statusCode": 200}',
        },
      });

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
        status_code: '200',
      });

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
        status_code: '200',
        response_templates: {
          'application/json': '',
        },
      });
    });

    it('should carry the origin override template when several origins are allowed', () => {
      const { restApi, stack } = setupInternalTestingRestApi();
      const corsHelper = new CorsHelper();

      corsHelper.createOptionsMethod(restApi, 'test-multi', 'resource-id', {
        allowOrigins: ['https://a.com', 'https://b.com'],
      });

      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
        response_parameters: expect.objectContaining({
          'method.response.header.Access-Control-Allow-Origin': "'https://a.com'",
          'method.response.header.Vary': "'Origin'",
        }),
        response_templates: {
          'application/json': expect.stringContaining('https://b.com'),
        },
      });
    });

    it('should include cors headers in integration response', () => {
      const { restApi, stack } = setupInternalTestingRestApi();
      const corsHelper = new CorsHelper();

      corsHelper.createOptionsMethod(restApi, 'test-cors', 'resource-id', {
        allowOrigins: 'https://example.com',
        allowMethods: ['GET', 'POST'],
        allowCredentials: true,
        maxAge: 7200,
      });

      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
        response_parameters: expect.objectContaining({
          'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST'",
          'method.response.header.Access-Control-Allow-Credentials': "'true'",
          'method.response.header.Access-Control-Max-Age': "'7200'",
        }),
      });
    });
  });
});
