import {
  type ClassResource,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@alicanto/common';
import {
  type AppModule,
  type AppStack,
  lambdaAssets,
  type ResolverType,
} from '@alicanto/resolver';
import { type ApiLambdaMetadata, type ApiResourceMetadata, RESOURCE_TYPE } from '../main';
import type { RestApiOptions } from './resolver.types';
import { RestApi } from './rest-api/rest-api';

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
      this.apis[id] = new RestApi(scope, `${id}-api`, {
        name: id,
      });
      return;
    }

    for (const option of this.options) {
      const restApi = new RestApi(scope, `${option.restApi.name}-api`, option.restApi);
      this.apis[option.restApi.name] = restApi;
    }
  }

  public async create(module: AppModule, resource: ClassResource) {
    const metadata: ApiResourceMetadata = getResourceMetadata(resource);
    const handlers = getResourceHandlerMetadata<ApiLambdaMetadata>(resource);
    lambdaAssets.initializeMetadata(metadata.foldername, metadata.filename, {
      className: metadata.originalName,
      methods: handlers
        .filter((handler) => !handler.integration)
        .map((handler) => handler.name),
    });

    const apiNames = Object.keys(this.apis);
    let api: RestApi = this.apis[apiNames[0]];

    if (apiNames.length > 0) {
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
    for (const option of this.options) {
      if (!option.extend) {
        continue;
      }

      const api = this.apis[option.restApi.name];

      option.extend({
        scope,
        api,
      });
    }

    // const pathPermissions = apiManager.getPathPermissions();
    // for (const apiName in pathPermissions) {
    //   for (const authorizerName in pathPermissions[apiName]) {
    //     const authorizer = apiManager.getAuthorizer(
    //       authorizerName,
    //       apiName
    //     ) as CustomAuthorizerData;
    //     const permissions = JSON.stringify(pathPermissions[apiName][authorizerName]);
    //     const path = join(process.cwd(), 'cdk.out', authorizer.assetPath);
    //     await writeFile(`${path}/${PERMISSION_DEFINITION_FILE}`, permissions);
    //   }
    // }
  }
}
