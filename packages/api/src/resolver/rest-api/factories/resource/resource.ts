import { cleanString } from '@alicanto/common';
import { ApiGatewayResource } from '@cdktf/provider-aws/lib/api-gateway-resource';

import type { RestApi } from '../../rest-api';

export class ResourceFactory {
  private resources: Record<string, ApiGatewayResource> = {};

  constructor(private scope: RestApi) {}

  public getResource(fullPath: string = '/') {
    let resourceId = this.scope.api.rootResourceId;
    if (fullPath === '/') {
      return resourceId;
    }

    if (this.resources[fullPath]) {
      return this.resources[fullPath].id;
    }

    const paths = [];
    const resourcePaths = fullPath.split('/');
    for (const resourcePath of resourcePaths) {
      paths.push(resourcePath);
      const path = paths.join('/');
      if (this.resources[path]) {
        resourceId = this.resources[path].id;
        continue;
      }

      const resource = new ApiGatewayResource(this.scope, cleanString(path), {
        parentId: resourceId,
        pathPart: resourcePath,
        restApiId: this.scope.api.id,
      });

      this.resources[path] = resource;
      resourceId = resource.id;
    }

    return resourceId;
  }
}
