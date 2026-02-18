import 'cdktn/lib/testing/adapters/jest';
import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppStack, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { Api, Get } from '../main';
import { ApiResolver } from './resolver';
import { RestApi } from './rest-api/rest-api';

jest.mock('@lafken/resolver', () => {
  const actual = jest.requireActual('@lafken/resolver');

  return {
    ...actual,
    LambdaHandler: jest.fn().mockImplementation(() => ({
      arn: 'test-function',
      invokeArn: 'invokeArn',
    })),
  };
});

describe('Api Resolver', () => {
  enableBuildEnvVariable();
  it('should create a new rest api with default properties in before create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    await resolver.beforeCreate(module as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(RestApi, {
      name: 'test-general',
    });
  });

  it('should create a new rest api in before create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'testing',
      },
    });

    await resolver.beforeCreate(module as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(RestApi, {
      name: 'testing',
    });
  });

  it('should create a new rest api in before create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'testing',
      },
    });

    await resolver.beforeCreate(module as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(RestApi, {
      name: 'testing',
    });
  });

  it('should create rest api methods', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api()
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethod, {
      http_method: 'GET',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'test',
    });
  });

  it('should create api resources with two rest api', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver(
      {
        restApi: {
          name: 'One',
        },
      },
      {
        restApi: {
          name: 'Two',
        },
      }
    );

    @Api({
      apiGatewayName: 'One',
    })
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethod, {
      http_method: 'GET',
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayResource, {
      path_part: 'test',
    });
  });

  it('should throw error when api not exist', async () => {
    const { module } = setupTestingStackWithModule();

    const resolver = new ApiResolver(
      {
        restApi: {
          name: 'One',
        },
      },
      {
        restApi: {
          name: 'Two',
        },
      }
    );

    @Api({
      apiGatewayName: 'other',
    })
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    expect(resolver.create(module, TestApi)).rejects.toThrow();
  });

  it('should create api stage in after create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api()
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'api',
    });
  });

  it('should create api stage with custom api in after create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
      },
    });

    @Api({
      apiGatewayName: 'test',
    })
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayStage, {
      stage_name: 'api',
    });
  });

  it('should call extends method in after create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const extend = jest.fn();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
      },
      extend,
    });

    @Api({
      apiGatewayName: 'test',
    })
    class TestApi {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);

    expect(extend).toHaveBeenCalledTimes(1);
  });
});
