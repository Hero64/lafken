import { ApiGatewayRequestValidator } from '@cdktf/provider-aws/lib/api-gateway-request-validator';
import type { RestApi } from '../../rest-api';
import type { GetValidatorProps } from './validator.types';

export class ValidatorFactory {
  private requestValidators: Record<string, ApiGatewayRequestValidator> = {};

  constructor(private scope: RestApi) {}

  public getValidator({
    validateRequestBody,
    validateRequestParameters,
  }: GetValidatorProps) {
    if (!validateRequestBody && !validateRequestParameters) {
      return undefined;
    }

    const id = `${validateRequestBody}-${validateRequestParameters}`;
    if (this.requestValidators[id]) {
      return this.requestValidators[id].id;
    }

    this.requestValidators[id] = new ApiGatewayRequestValidator(this.scope, id, {
      name: id,
      restApiId: this.scope.api.id,
      validateRequestBody,
      validateRequestParameters,
    });

    return this.requestValidators[id].id;
  }
}
