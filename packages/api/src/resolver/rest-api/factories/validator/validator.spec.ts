import { ApiGatewayRequestValidator } from '@cdktn/provider-aws/lib/api-gateway-request-validator';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../../utils/testing.utils';

describe('Validator factory', () => {
  enableBuildEnvVariable();
  it('should create a resource', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    restApi.validatorFactory.getValidator({
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayRequestValidator, {
      name: 'true-false',
      validate_request_body: true,
      validate_request_parameters: false,
    });
  });
});
