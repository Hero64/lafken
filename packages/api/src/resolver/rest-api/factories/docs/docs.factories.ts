import { ApiGatewayDocumentationPart } from '@cdktn/provider-aws/lib/api-gateway-documentation-part';
import { ApiGatewayDocumentationVersion } from '@cdktn/provider-aws/lib/api-gateway-documentation-version';
import { createSha256 } from '@lafken/resolver';
import type { TerraformResource } from 'cdktn';
import type { RestApi } from '../../../resolver.types';
import type { CreateDocProps, DocVersion } from './docs.types';

export class DocsFactory {
  private docResources: TerraformResource[] = [];
  private properties: string[] = [];

  constructor(private scope: RestApi) {}

  get resources() {
    return this.docResources;
  }

  public createDoc({ id, location, properties }: CreateDocProps) {
    if (this.scope.openapiFactory.isEnabled) {
      return undefined;
    }

    const propertiesString = JSON.stringify(properties);
    this.properties.push(propertiesString);

    const docPart = new ApiGatewayDocumentationPart(this.scope, `${id}-doc-part`, {
      restApiId: this.scope.id,
      location,
      properties: propertiesString,
    });

    this.docResources.push(docPart);
    return docPart;
  }

  public createVersion() {
    const { version, dependencies = [] } = this.scope.openapiFactory.isEnabled
      ? this.openApiVersion()
      : this.resourceVersion();

    if (!version) {
      return;
    }

    const docVersion = new ApiGatewayDocumentationVersion(this.scope, 'doc-version', {
      restApiId: this.scope.id,
      version,
      dependsOn: dependencies,
    });

    this.docResources.push(docVersion);

    return docVersion;
  }

  private resourceVersion(): DocVersion {
    if (this.properties.length === 0) {
      return {};
    }

    return {
      version: createSha256(this.properties.sort().join('')),
      dependencies: this.docResources,
    };
  }

  private openApiVersion(): DocVersion {
    const parts = this.scope.openapiFactory.documentationPartsList;
    if (parts.length === 0) {
      return {};
    }

    return {
      version: createSha256(
        parts
          .map((part) => JSON.stringify(part))
          .sort()
          .join('')
      ),
    };
  }
}
