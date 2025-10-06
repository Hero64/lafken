import {
  type ClassResource,
  getMetadataPrototypeByKey,
  LambdaReflectKeys,
  type PayloadMetadata,
} from '@alicanto/common';
import type { FieldParams, ParamMetadata } from '../../../../../main';
import type { ParamBySource } from './param.types';

export class ParamHelper {
  private _params: ParamMetadata[];
  private _pathParams: Record<string, FieldParams>;
  private _paramsBySource: ParamBySource;
  private _additionalInformation: PayloadMetadata;

  constructor(
    private classResource: ClassResource,
    private methodName: string
  ) {}

  get params() {
    if (this._params !== undefined) {
      return this._params;
    }

    const params =
      getMetadataPrototypeByKey<Record<string, ParamMetadata[]>>(
        this.classResource,
        LambdaReflectKeys.EVENT_PARAM
      ) || {};

    const paramsByHandler = params[this.methodName];

    this._params = paramsByHandler || [];

    return this._params;
  }

  get pathParams() {
    if (this._pathParams !== undefined) {
      return this._pathParams;
    }

    this._pathParams = this.flattenedFieldParams({
      fieldType: 'Object',
      params: {
        fields: this.params,
      },
    });

    return this._pathParams;
  }

  get paramsBySource() {
    if (this._paramsBySource !== undefined) {
      return this._paramsBySource;
    }

    this._paramsBySource = {};

    for (const arg of this.params) {
      this._paramsBySource[arg.source] ??= [];
      this._paramsBySource[arg.source]?.push(arg);
    }

    return this._paramsBySource;
  }

  get additionalInformation() {
    if (this._additionalInformation !== undefined) {
      return this._additionalInformation;
    }

    const informationByHandler =
      getMetadataPrototypeByKey<Record<string, PayloadMetadata>>(
        this.classResource,
        LambdaReflectKeys.ADDITIONAL_EVENT_INFORMATION
      ) || {};

    if (!informationByHandler[this.methodName]) {
      throw new Error(
        `The event from handler ${this.methodName} must have the event @Payload decorator`
      );
    }

    this._additionalInformation = informationByHandler[this.methodName];

    return this._additionalInformation;
  }

  private flattenedFieldParams(fieldParams: FieldParams, paths: string[] = []) {
    let eventPaths: Record<string, FieldParams> = {};

    const path = paths.join('.');
    eventPaths[path] = fieldParams;

    if (!fieldParams.params || fieldParams.fieldType === 'Array') {
      return eventPaths;
    }

    const fields = fieldParams.params.fields || [];

    for (const field of fields) {
      eventPaths = {
        ...eventPaths,
        ...this.flattenedFieldParams(
          {
            ...field,
            source: fieldParams.source || field.source,
            required: field.required ?? fieldParams.required,
          },
          [...paths, field.destinationField]
        ),
      };
    }

    return eventPaths;
  }
}
