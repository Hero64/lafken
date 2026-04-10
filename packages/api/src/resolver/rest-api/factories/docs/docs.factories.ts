import { ApiGatewayDocumentationPart } from '@cdktn/provider-aws/lib/api-gateway-documentation-part';
import { ApiGatewayDocumentationVersion } from '@cdktn/provider-aws/lib/api-gateway-documentation-version';
import { createSha256 } from '@lafken/resolver';
import type { TerraformResource } from 'cdktn';
import type { RestApi } from '../../../resolver.types';
import type { CreateDocProps } from './docs.types';

export class DocsFactory {
  private docResources: TerraformResource[] = [];
  private properties: string[] = [];

  constructor(private scope: RestApi) {}

  get resources() {
    return this.docResources;
  }

  public createDoc({ id, location, properties }: CreateDocProps) {
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
    if (this.properties.length === 0) {
      return;
    }

    const version = createSha256(this.properties.sort().join(''));

    const docVersion = new ApiGatewayDocumentationVersion(this.scope, 'doc-version', {
      restApiId: this.scope.id,
      version,
      dependsOn: this.docResources,
    });

    this.docResources.push(docVersion);

    return docVersion;
  }
}
