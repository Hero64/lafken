import { DataAwsApiGatewayRestApi } from '@cdktn/provider-aws/lib/data-aws-api-gateway-rest-api';
import { lafkenResource } from '@lafken/resolver';
import type { Construct } from 'constructs';
import type { ExternalApiProps } from '../../resolver.types';
import { RestApiBase } from '../base/base';

export class ExternalRestApi extends RestApiBase(
  lafkenResource.make(DataAwsApiGatewayRestApi)
) {
  constructor(scope: Construct, id: string, props: ExternalApiProps) {
    super(scope, `${id}-api`, {
      name: props.name,
    });

    if (props.ref) {
      this.register('api', props.ref);
    }
    this.initialize(props);
  }
}
