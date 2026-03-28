import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../../utils/testing.utils';

describe('Resource factory', () => {
  enableBuildEnvVariable();
  it('should create a resource', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    restApi.resourceFactory.getResource('foo/bar');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'foo',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'bar',
    });
  });
});
