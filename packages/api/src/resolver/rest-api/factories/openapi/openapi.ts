import type { RestApi } from '../../../resolver.types';
import type { JsonSchema } from '../model/model.types';
import type {
  OpenApiDocument,
  OperationObject,
  RequestValidatorObject,
  SecuritySchemeObject,
} from './openapi.types';

/**
 * Accumulates an OpenAPI 3.0 document from the same configuration the
 * per-resource factories compute, and injects it into the REST API `body`
 * so API Gateway imports the whole API in a single Terraform resource.
 *
 * When {@link isEnabled} is `false` the factory is inert: the classic
 * "resource" creation path is used and nothing here is invoked.
 */
export class OpenApiFactory {
  private paths: OpenApiDocument['paths'] = {};
  private schemas: Record<string, JsonSchema> = {};
  private securitySchemes: Record<string, SecuritySchemeObject> = {};
  private requestValidators: Record<string, RequestValidatorObject> = {};
  private binaryMediaTypes?: string[];
  private minimumCompressionSize?: number;
  private apiKeySource?: string;
  private description?: string;
  private deferred: Array<() => void | Promise<void>> = [];

  constructor(
    private scope: RestApi,
    public readonly isEnabled: boolean
  ) {}

  get hasOperations() {
    return Object.keys(this.paths).length > 0;
  }

  public addOperation(path: string, method: string, operation: OperationObject) {
    const normalizedPath = this.normalizePath(path);
    this.paths[normalizedPath] ??= {};
    this.paths[normalizedPath][method.toLowerCase()] = operation;
  }

  public addSchema(name: string, schema: JsonSchema) {
    this.schemas[name] = schema;
    return this.getSchemaRef(name);
  }

  public getSchemaRef(name: string) {
    return `#/components/schemas/${name}`;
  }

  public addSecurityScheme(name: string, scheme: SecuritySchemeObject) {
    this.securitySchemes[name] = scheme;
  }

  public addRequestValidator(name: string, validator: RequestValidatorObject) {
    this.requestValidators[name] = validator;
  }

  public setBinaryMediaTypes(types?: string[]) {
    if (types && types.length > 0) {
      this.binaryMediaTypes = types;
    }
  }

  public setMinimumCompressionSize(size?: number) {
    this.minimumCompressionSize = size;
  }

  public setApiKeySource(source?: string) {
    this.apiKeySource = source;
  }

  public setDescription(description?: string) {
    this.description = description;
  }

  /**
   * Registers a callback to rebuild spec fragments whose values are not yet
   * resolvable at synth time (mirrors the per-integration `onResolve` used in
   * "resource" mode). Callbacks run once during resolution, after which the
   * body is re-serialized.
   */
  public addDeferred(callback: () => void | Promise<void>) {
    this.deferred.push(callback);
  }

  /**
   * Serializes the accumulated document into `restApi.body`. The document holds
   * Terraform tokens (lambda `invokeArn`, role `arn`, region, …) as string
   * placeholders; `JSON.stringify` keeps those markers so CDKTN resolves them
   * when the `body` string attribute is synthesized. `Fn.jsonencode` cannot be
   * used here because CDKTN built-in functions do not support embedded token
   * escape sequences (`${...}`).
   */
  public finalize(): string | undefined {
    if (!this.isEnabled || !this.hasOperations) {
      return undefined;
    }

    const body = this.serialize();
    this.setBody(body);

    if (this.deferred.length > 0) {
      this.scope.onResolve(async () => {
        for (const callback of this.deferred) {
          await callback();
        }
        this.setBody(this.serialize());
      });
    }

    return body;
  }

  /**
   * `body` only exists on the internal `ApiGatewayRestApi` construct; openapi
   * mode is internal-only, so this write is unreachable for external APIs.
   */
  private setBody(value: string) {
    (this.scope as unknown as { body: string }).body = value;
  }

  private serialize() {
    return JSON.stringify(this.buildDocument());
  }

  private buildDocument(): OpenApiDocument {
    const document: OpenApiDocument = {
      openapi: '3.0.1',
      info: {
        title: this.scope.node.id,
        version: '1.0.0',
        description: this.description,
      },
      paths: this.paths,
      components: {
        schemas: Object.keys(this.schemas).length > 0 ? this.schemas : undefined,
        securitySchemes:
          Object.keys(this.securitySchemes).length > 0 ? this.securitySchemes : undefined,
      },
    };

    if (Object.keys(this.requestValidators).length > 0) {
      document['x-amazon-apigateway-request-validators'] = this.requestValidators;
    }
    if (this.binaryMediaTypes) {
      document['x-amazon-apigateway-binary-media-types'] = this.binaryMediaTypes;
    }
    if (this.minimumCompressionSize !== undefined) {
      document['x-amazon-apigateway-minimum-compression-size'] =
        this.minimumCompressionSize;
    }
    if (this.apiKeySource) {
      document['x-amazon-apigateway-api-key-source'] = this.apiKeySource;
    }

    return document;
  }

  private normalizePath(path: string) {
    const trimmed = path.replace(/^\/+|\/+$/g, '');
    return `/${trimmed}`;
  }
}
