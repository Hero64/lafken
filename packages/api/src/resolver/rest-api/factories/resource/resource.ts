import { cleanString } from '@alicanto/common';
import { ApiGatewayResource } from '@cdktf/provider-aws/lib/api-gateway-resource';

import type { RestApi } from '../../rest-api';

export class ResourceFactory {
  private apiResources: Record<string, ApiGatewayResource> = {};

  constructor(private scope: RestApi) {}

  get resources() {
    return Object.values(this.apiResources);
  }

  public getResource(fullPath: string = '/') {
    let resourceId = this.scope.rootResourceId;
    if (fullPath === '/') {
      return resourceId;
    }

    if (this.apiResources[fullPath]) {
      return this.apiResources[fullPath].id;
    }

    const paths = [];
    const resourcePaths = fullPath.split('/').filter(Boolean);
    for (const resourcePath of resourcePaths) {
      paths.push(resourcePath);
      const path = paths.join('/');
      if (this.apiResources[path]) {
        resourceId = this.apiResources[path].id;
        continue;
      }

      const resource = new ApiGatewayResource(this.scope, cleanString(path), {
        parentId: resourceId,
        pathPart: resourcePath,
        restApiId: this.scope.id,
      });

      this.apiResources[path] = resource;
      resourceId = resource.id;
    }

    return resourceId;
  }
}
