import {
  type ClassResource,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@lafken/common';
import type { ApiObjectMetadata, ApiParamMetadata } from '../../../../../../main';
import type { ParamBySource } from './param.types';

export class ParamHelper {
  private _params: ApiObjectMetadata;
  private _pathParams: Record<string, ApiParamMetadata>;
  private _paramsBySource: ParamBySource;

  constructor(
    private classResource: ClassResource,
    private methodName: string
  ) {}

  get params() {
    if (this._params !== undefined) {
      return this._params;
    }

    const params =
      getMetadataPrototypeByKey<Record<string, ApiObjectMetadata>>(
        this.classResource,
        LambdaReflectKeys.event_param
      ) || {};

    const paramsByHandler = params[this.methodName];

    this._params = paramsByHandler;

    return this._params;
  }

  get pathParams() {
    if (this._pathParams !== undefined) {
      return this._pathParams;
    }

    if (this.params === undefined) {
      this._pathParams = {};
      return this._pathParams;
    }

    this._pathParams = this.flattenedField(this.params);

    return this._pathParams;
  }

  get paramsBySource() {
    if (this._paramsBySource !== undefined) {
      return this._paramsBySource;
    }

    this._paramsBySource = {};
    if (this.params?.properties) {
      for (const property of this.params.properties) {
        const { source = 'query' } = property;
        this._paramsBySource[source] ??= [];
        this._paramsBySource[source].push(property);
      }
    }

    return this._paramsBySource;
  }

  public validateParamsInPath(fullPath: string) {
    const { path = [] } = this.paramsBySource;

    const paramRegex = /\{([a-zA-Z0-9_-]+)([+*])?\}/g;
    const foundParams = new Set<string>();
    let match: RegExpExecArray | null;

    while (true) {
      match = paramRegex.exec(fullPath);
      if (match === null) {
        break;
      }
      foundParams.add(match[1]);
    }

    const pathParams = new Set(path.map((param) => param.name));

    const missing = [...pathParams].filter((param) => !foundParams.has(param));
    const extra = [...foundParams].filter((param) => !pathParams.has(param));

    if (missing.length) {
      throw new Error(
        `there are parameters "${missing.join(', ')}" that do not exist in the path ${fullPath} , modify your URL or remove the payload parameters in the ${this.classResource.name} class`
      );
    }

    if (extra.length) {
      throw new Error(
        `There are extra parameters "${extra.join(', ')}" in the "${fullPath}" url. Add path parameters to payload lass or remove them from the URL`
      );
    }
  }

  private flattenedField(field: ApiParamMetadata, paths: string[] = []) {
    let eventPaths: Record<string, ApiParamMetadata> = {};

    const path = paths.join('.');
    eventPaths[path] = field;

    if (field.type === 'Array') {
      return eventPaths;
    }

    if (field.type === 'Object') {
      for (const property of field.properties) {
        eventPaths = {
          ...eventPaths,
          ...this.flattenedField(property, [...paths, property.destinationName]),
        };
      }
    }

    return eventPaths;
  }
}
