import { LambdaHandler } from '@lafken/resolver';
import type { OpenApiIntegrationProps } from '../integration.types';

/**
 * Creates the lambda function + `apigateway.amazonaws.com` invoke permission.
 * Shared by both the "resource" and "openapi" creation paths.
 */
export const createLambdaHandler = (props: OpenApiIntegrationProps) => {
  const { scope, handler, resourceMetadata, restApi } = props;

  return new LambdaHandler(scope, `${handler.name}-${resourceMetadata.name}`, {
    ...handler,
    description: handler.summary || handler.description,
    originalName: resourceMetadata.originalName,
    filename: resourceMetadata.filename,
    foldername: resourceMetadata.foldername,
    principal: 'apigateway.amazonaws.com',
    sourceArn: `${restApi.executionArn}/*/*`,
    suffix: 'api',
  });
};

/**
 * API Gateway integration URI that invokes the Lambda through the
 * `InvokeWithResponseStream` action (required by AWS when
 * `responseTransferMode` is `STREAM`). The standard `invoke_arn` targets the
 * classic `Invoke` action (`/2015-03-31/.../invocations`); response streaming
 * needs the `/2021-11-15/.../response-streaming-invocations` path instead.
 *
 * Built as a plain string from simple attribute tokens (region + function ARN)
 * so it also serializes correctly inside the OpenAPI `body` document, which
 * cannot embed Terraform function calls such as `replace()`.
 */
export const streamingInvokeUri = (regionRef: string, functionArn: string) =>
  `arn:aws:apigateway:${regionRef}:lambda:path/2021-11-15/functions/${functionArn}/response-streaming-invocations`;

export const buildRequestTemplates = (props: OpenApiIntegrationProps) => {
  const { paramHelper, templateHelper } = props;

  return paramHelper.params
    ? {
        'application/json': templateHelper.generateTemplate({
          field: paramHelper.params,
        }),
      }
    : undefined;
};
