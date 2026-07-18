import type { ApiParamMetadata } from '../../../../main';
import type { ParamBySource } from '../method/helpers/param/param.types';
import { schemaTypeMap } from '../model/model';
import type { JsonSchema } from '../model/model.types';
import type {
  OperationObject,
  ParameterLocation,
  ParameterObject,
} from './openapi.types';

const METHOD_RESPONSE_HEADER_PREFIX = 'method.response.header.';

const SOURCE_TO_LOCATION: Partial<Record<string, ParameterLocation>> = {
  query: 'query',
  path: 'path',
  header: 'header',
};

/**
 * Maps request params (query/path/header) to OpenAPI `parameters`. Body params
 * are excluded (they become the `requestBody`).
 */
export function paramsToOpenApiParameters(
  paramsBySource: ParamBySource
): ParameterObject[] | undefined {
  const parameters: ParameterObject[] = [];

  for (const [source, location] of Object.entries(SOURCE_TO_LOCATION)) {
    const params = paramsBySource[source as keyof ParamBySource];
    if (!params || !location) {
      continue;
    }

    for (const param of params) {
      parameters.push(toParameterObject(param, location));
    }
  }

  return parameters.length > 0 ? parameters : undefined;
}

function toParameterObject(
  param: ApiParamMetadata,
  location: ParameterLocation
): ParameterObject {
  const schema: JsonSchema = {
    type: (schemaTypeMap[param.type] ?? 'string') as JsonSchema['type'],
  };

  return {
    name: param.name,
    in: location,
    required: location === 'path' ? true : (param.required ?? true),
    description: 'description' in param ? param.description : undefined,
    schema,
  };
}

/**
 * Builds the mock `OPTIONS` operation that answers CORS preflight requests,
 * reusing the header map produced by `CorsHelper.buildHeaders`.
 */
export function corsToOptionsOperation(
  corsHeaders: Record<string, string>
): OperationObject {
  const responseHeaders: Record<string, { schema: JsonSchema }> = {};
  for (const key of Object.keys(corsHeaders)) {
    const name = key.replace(METHOD_RESPONSE_HEADER_PREFIX, '');
    responseHeaders[name] = { schema: { type: 'string' } };
  }

  return {
    responses: {
      '200': { description: 'CORS support', headers: responseHeaders },
    },
    'x-amazon-apigateway-integration': {
      type: 'mock',
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
      responses: {
        default: {
          statusCode: '200',
          responseParameters: corsHeaders,
          responseTemplates: { 'application/json': '' },
        },
      },
    },
  };
}
