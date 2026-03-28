import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { lafkenResource, ResourceOutput } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ApiOutputAttributes, RestApiProps } from '../../resolver.types';
import { RestApiBase } from '../base/base';

export class InternalRestApi extends RestApiBase(lafkenResource.make(ApiGatewayRestApi)) {
  constructor(scope: Construct, id: string, props: RestApiProps) {
    super(scope, `${id}-api`, {
      name: props.name,
      binaryMediaTypes: props.supportedMediaTypes,
      apiKeySource: props.apiKeySource ? props.apiKeySource.toUpperCase() : undefined,
      disableExecuteApiEndpoint: props.disableExecuteApiEndpoint,
      minimumCompressionSize: props.minCompressionSize
        ? props.minCompressionSize.toString()
        : undefined,
    });
    this.isGlobal('api', id);
    this.initFactories(props);
    new ResourceOutput<ApiOutputAttributes>(this, props.outputs);
  }
}
