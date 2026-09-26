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

  it('should keep the same address when a path parameter is renamed', () => {
    const synthAddresses = (path: string) => {
      const { restApi, stack } = setupInternalTestingRestApi();
      restApi.resourceFactory.getResource(path);
      const synthesized = JSON.parse(Testing.synth(stack));
      return {
        addresses: Object.keys(synthesized.resource.aws_api_gateway_resource).sort(),
        moved: synthesized.moved,
      };
    };

    const before = synthAddresses('users/{id}/posts');
    const after = synthAddresses('users/{userId}/posts');

    expect(after.addresses).toEqual(before.addresses);
    expect(before.moved).toHaveLength(2);
    expect(before.moved[0].from).toMatch(/^aws_api_gateway_resource\..*usersid/);
  });

  it('should throw when two path parameters share the same level', () => {
    const { restApi } = setupInternalTestingRestApi();

    restApi.resourceFactory.getResource('users/{id}');

    expect(() => restApi.resourceFactory.getResource('users/{userId}')).toThrow(
      'only one path parameter is allowed at the same level'
    );
  });

  it('should not move from a legacy id that is still declared', () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    restApi.resourceFactory.getResource('pokemon/{name}');
    restApi.resourceFactory.getResource('pokemon/name');

    const synthesized = JSON.parse(Testing.synth(stack));
    const declared = Object.keys(synthesized.resource.aws_api_gateway_resource).map(
      (id) => `aws_api_gateway_resource.${id}`
    );

    expect(declared).toHaveLength(3);
    expect(synthesized.moved ?? []).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ from: expect.stringMatching(/pokemonname_/) }),
      ])
    );
  });
});
