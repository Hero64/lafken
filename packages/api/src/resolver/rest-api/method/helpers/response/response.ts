import type { FieldTypes } from '@alicanto/common';
import {
  type ApiLambdaMetadata,
  HTTP_STATUS_CODE,
  type HTTP_STATUS_CODE_NUMBER,
  type Method,
  type ResponseApiObjectField,
} from '../../../../../main';
import type { ResponseHandler } from './response.types';
import {
  defaultDataResponseTemplate,
  defaultResponses,
  getSuccessStatusCode,
} from './response.utils';

const typesWithObjects = new Set<FieldTypes>(['Object', 'Array']);

export class ResponseHelper {
  private _handlerResponse: ResponseHandler[];
  constructor(private handler: ApiLambdaMetadata) {}

  get handlerResponse(): ResponseHandler[] {
    if (this._handlerResponse !== undefined) {
      return this._handlerResponse;
    }

    this._handlerResponse = defaultResponses(this.handler.method);

    if (!this.handler.response) {
      return this._handlerResponse;
    }

    if (
      !typesWithObjects.has(this.handler.response.type) ||
      (this.handler.response.type === 'Array' &&
        this.handler.response.items.type !== 'Object')
    ) {
      this._handlerResponse[0] = {
        ...this._handlerResponse[0],
        field: this.handler.response,
      };
      return this._handlerResponse;
    }

    if (this.handler.response.type === 'Object') {
      this.setHandlerResponseByConfig(this.handler.response, this.handler.method);
    }

    if (
      this.handler.response.type === 'Array' &&
      this.handler.response.items.type === 'Object'
    ) {
      this.setHandlerResponseByConfig(this.handler.response.items, this.handler.method);
    }

    return this._handlerResponse;
  }

  private setHandlerResponseByConfig(response: ResponseApiObjectField, method: Method) {
    const { defaultCode = getSuccessStatusCode(method) } = response.payload;
    const responses: ResponseHandler[] = [];

    responses.push({
      statusCode: (defaultCode || getSuccessStatusCode(method)).toString(),
      field: response,
    });

    if (!response.payload.responses) {
      this._handlerResponse = responses;
      return responses;
    }

    for (const statusCode in response.payload.responses) {
      const subResponse = response.payload.responses[statusCode];

      responses.push({
        statusCode,
        field: subResponse === true ? undefined : subResponse,
        template: defaultDataResponseTemplate(
          HTTP_STATUS_CODE[statusCode as unknown as HTTP_STATUS_CODE_NUMBER]
        ),
      });
    }

    this._handlerResponse = responses;
  }
}
