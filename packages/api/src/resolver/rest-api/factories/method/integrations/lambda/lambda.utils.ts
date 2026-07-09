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
