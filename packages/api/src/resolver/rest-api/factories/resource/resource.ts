import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { cleanString } from '@lafken/common';
import type { RestApi } from '../../../resolver.types';
import { moveFromLegacyId } from '../../../utils/legacy-id.utils';

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

      const constructId = this.getConstructId(path);
      const sibling = this.scope.node.tryFindChild(constructId) as
        | ApiGatewayResource
        | undefined;
      if (sibling) {
        throw new Error(
          `API path "/${path}" conflicts with "${sibling.pathPartInput}": only one path parameter is allowed at the same level`
        );
      }

      const resource = new ApiGatewayResource(this.scope, constructId, {
        parentId: resourceId,
        pathPart: resourcePath,
        restApiId: this.scope.id,
      });

      moveFromLegacyId(resource, this.cleanPart(path));

      this.apiResources[path] = resource;
      resourceId = resource.id;
    }

    return resourceId;
  }

  public getConstructId(path: string) {
    const constructId = path
      .split('/')
      .map((part) => {
        const variable = part.match(/^\{[^}]+?(\+)?\}$/);
        if (variable) {
          return variable[1] ? '_proxy' : '_param';
        }
        return this.cleanPart(part);
      })
      .join('');

    return constructId || '_root';
  }

  private cleanPart(part: string) {
    return cleanString(part.replace(/[+*]/g, (m) => (m === '+' ? 'plus' : 'asterisk')));
  }
}
