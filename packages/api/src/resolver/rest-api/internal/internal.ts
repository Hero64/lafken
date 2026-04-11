import { ApiGatewayRestApi } from '@cdktn/provider-aws/lib/api-gateway-rest-api';
import { getExternalValues, lafkenResource, ResourceOutput } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ApiOutputAttributes, RestApiProps } from '../../resolver.types';
import { RestApiBase } from '../base/base';

export class InternalRestApi extends RestApiBase(lafkenResource.make(ApiGatewayRestApi)) {
  constructor(
    scope: Construct,
    id: string,
    private props: RestApiProps
  ) {
    super(scope, `${id}-api`, {
      name: props.name,
      binaryMediaTypes: props.supportedMediaTypes,
      apiKeySource: props.apiKeySource ? props.apiKeySource.toUpperCase() : undefined,
      disableExecuteApiEndpoint: props.disableExecuteApiEndpoint,
      minimumCompressionSize: props.minCompressionSize
        ? props.minCompressionSize.toString()
        : undefined,
      lifecycle: {
        createBeforeDestroy: true,
      },
    });

    this.addEndpointConfiguration();

    this.isGlobal('api', id);
    this.initFactories(props);
    new ResourceOutput<ApiOutputAttributes>(this, props.outputs);
  }

  private addEndpointConfiguration() {
    if (!this.props.endpointConfiguration) {
      return;
    }

    if (this.props.endpointConfiguration.type === 'private') {
      this.vpcIds =
        typeof this.props.endpointConfiguration.vpcEndpointIds === 'function'
          ? this.props.endpointConfiguration.vpcEndpointIds(getExternalValues(this))
          : this.props.endpointConfiguration.vpcEndpointIds;

      this.putEndpointConfiguration({
        types: [this.props.endpointConfiguration.type.toUpperCase()],
        ipAddressType: 'dualstack',
        vpcEndpointIds: this.vpcIds,
      });
      return;
    }

    this.putEndpointConfiguration({
      types: [this.props.endpointConfiguration.type.toUpperCase()],
      ipAddressType: this.props.endpointConfiguration.ipAddressType,
    });
  }
}
