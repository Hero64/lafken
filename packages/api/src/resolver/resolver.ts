import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import {
  type AppModule,
  type AppStack,
  lambdaAssets,
  type ResolverType,
} from '@lafken/resolver';
import { type ApiLambdaMetadata, type ApiResourceMetadata, RESOURCE_TYPE } from '../main';
import type { RestApi, RestApiOptions } from './resolver.types';
import { ExternalRestApi } from './rest-api/external/external';
import { InternalRestApi } from './rest-api/internal/internal';

export class ApiResolver implements ResolverType {
  public type = RESOURCE_TYPE;
  private options: RestApiOptions[] = [];
  private apis: Record<string, RestApi> = {};

  constructor(...options: RestApiOptions[]) {
    this.options = options;
  }

  public async beforeCreate(scope: AppStack) {
    if (this.options.length === 0) {
      const id = `${scope.id}-general`;
      this.apis[id] = new InternalRestApi(scope, id, {
        name: id,
      });
      return;
    }

    for (const option of this.options) {
      if (option.restApi.externalName === undefined) {
        this.apis[option.restApi.name] = new InternalRestApi(
          scope,
          option.restApi.name,
          option.restApi
        );
      } else {
        this.apis[option.restApi.name] = new ExternalRestApi(
          scope,
          option.restApi.name,
          option.restApi
        );
      }
    }
  }

  public async create(module: AppModule, resource: ClassResource) {
    const metadata: ApiResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(resource);
    lambdaAssets.initializeMetadata({
      foldername: metadata.foldername,
      filename: metadata.filename,
      minify: metadata.minify,
      className: metadata.originalName,
      methods: handlers
        .filter((handler) => !handler.integration)
        .map((handler) => handler.name),
    });

    const apiNames = Object.keys(this.apis);

    let api = this.apis[apiNames[0]];

    if (apiNames.length > 1) {
      api = this.apis[metadata.apiGatewayName];

      if (!metadata.apiGatewayName || !api) {
        throw new Error(
          `must specify the name of the API gateway in module ${module.id}`
        );
      }
    }

    for (const handler of handlers) {
      await api.addMethod(module, {
        handler,
        classResource: resource,
        resourceMetadata: metadata,
      });
    }
  }

  public async afterCreate(scope: AppStack) {
    if (this.options.length === 0) {
      const defaultApi = Object.values(this.apis)[0];
      defaultApi.createStageDeployment();
      return;
    }

    for (const option of this.options) {
      const api = this.apis[option.restApi.name];
      api.createStageDeployment();

      if (!option.extend) {
        continue;
      }

      await option.extend({
        scope,
        api,
      });
    }
  }
}
