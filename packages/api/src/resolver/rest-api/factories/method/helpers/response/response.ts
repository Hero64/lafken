import type { FieldTypes } from '@lafken/common';
import {
  type ApiLambdaMetadata,
  HTTP_STATUS_CODE,
  type HTTP_STATUS_CODE_NUMBER,
  type Method,
  type ResponseFieldMetadata,
  type ResponseObjectMetadata,
} from '../../../../../../main';
import type { ResponseHandler } from './response.types';
import {
  defaultDataResponseTemplate,
  defaultResponses,
  getSuccessStatusCode,
  InternalDefaultHttpResponse,
} from './response.utils';

const typesWithObjects = new Set<FieldTypes>(['Object', 'Array']);

export class ResponseHelper {
  private _handlerResponse: ResponseHandler[];
  private codeResponses = new Set<string>([]);
  constructor(private handler: ApiLambdaMetadata) {}

  get handlerResponse(): ResponseHandler[] {
    if (this._handlerResponse !== undefined) {
      return this._handlerResponse;
    }
    this._handlerResponse = defaultResponses(
      this.handler.method,
      !!this.handler.integration
    );

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
      this.setHandlerResponseByConfig(
        this.addDefaultResponses(this.handler.response),
        this.handler.method
      );
    }

    if (
      this.handler.response.type === 'Array' &&
      this.handler.response.items.type === 'Object'
    ) {
      // The status code configuration lives in the item payload, but the body
      // returned by the handler is the array itself, so it is the array that
      // must be mapped to the success response model.
      this.setHandlerResponseByConfig(
        this.addDefaultResponses(this.handler.response.items),
        this.handler.method,
        this.handler.response
      );
    }

    return this._handlerResponse;
  }

  private setHandlerResponseByConfig(
    response: ResponseObjectMetadata,
    method: Method,
    successField: ResponseFieldMetadata = response
  ) {
    const { defaultCode = getSuccessStatusCode(method) } = response.payload;
    const responses: ResponseHandler[] = [];

    responses.push({
      statusCode: (defaultCode || getSuccessStatusCode(method)).toString(),
      field: successField,
      selectionPattern: response.payload.selectionPattern,
    });

    for (const statusCode in response.payload.responses) {
      if (this.codeResponses.has(statusCode)) {
        continue;
      }
      this.codeResponses.add(statusCode);
      const subResponse = response.payload.responses[statusCode];

      responses.push({
        statusCode,
        field: subResponse === true ? undefined : subResponse,
        selectionPattern: `.*${HTTP_STATUS_CODE[statusCode as unknown as HTTP_STATUS_CODE_NUMBER]}.*`,
        template: defaultDataResponseTemplate(
          HTTP_STATUS_CODE[statusCode as unknown as HTTP_STATUS_CODE_NUMBER]
        ),
      });
    }

    this._handlerResponse = responses;
  }

  private addDefaultResponses(data: ResponseObjectMetadata) {
    if (this.handler.integration) {
      return data;
    }

    data.payload.responses = {
      '400': InternalDefaultHttpResponse,
      '500': InternalDefaultHttpResponse,
      ...(data.payload.responses || {}),
    };

    return data;
  }
}
