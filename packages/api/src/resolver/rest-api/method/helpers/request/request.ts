import type { ApiFieldMetadata } from '../../../../../main';
import type { ParamHelper } from '../param/param';

export class RequestHelper {
  constructor(private methodParams: ParamHelper) {}

  public getRequestParameters() {
    const { paramsBySource } = this.methodParams;

    const requestParameters = {
      ...this.mapUrlParameters('querystring', paramsBySource.query),
      ...this.mapUrlParameters('path', paramsBySource.path),
      ...this.mapUrlParameters('header', paramsBySource.header),
    };

    if (Object.keys(requestParameters).length === 0) {
      return undefined;
    }

    return requestParameters;
  }

  public generateMethodRequestType(
    type: 'querystring' | 'path' | 'header',
    name: string
  ) {
    return `method.request.${type}.${name}`;
  }

  public getValidatorProperties() {
    const { paramsBySource } = this.methodParams;

    return {
      validateRequestParameters:
        paramsBySource.query !== undefined || paramsBySource.path !== undefined,
      validateRequestBody: !!paramsBySource.body?.some(
        (param) => param.validation?.required
      ),
    };
  }

  private mapUrlParameters(
    type: 'querystring' | 'path' | 'header',
    params: ApiFieldMetadata[] = []
  ) {
    return Object.fromEntries(
      params.map((param) => [
        this.generateMethodRequestType(type, param.name),
        param.validation?.required ?? true,
      ])
    );
  }
}
