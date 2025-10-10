import {
  type ClassResource,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
} from '@alicanto/common';
import type { ApiObjectParam, ApiParamMetadata } from '../../../../../main';
import type { ParamBySource } from './param.types';

export class ParamHelper {
  private _params: ApiObjectParam;
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
      getMetadataPrototypeByKey<Record<string, ApiObjectParam>>(
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
