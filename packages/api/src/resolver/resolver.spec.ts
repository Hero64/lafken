import { ApiGatewayMethod } from '@cdktn/provider-aws/lib/api-gateway-method';
import { ApiGatewayMethodSettings } from '@cdktn/provider-aws/lib/api-gateway-method-settings';
import { ApiGatewayResource } from '@cdktn/provider-aws/lib/api-gateway-resource';
import { ApiGatewayRestApiPolicy } from '@cdktn/provider-aws/lib/api-gateway-rest-api-policy';
import { ApiGatewayStage } from '@cdktn/provider-aws/lib/api-gateway-stage';
import { enableBuildEnvVariable } from '@lafken/common';
import { type AppStack, setupTestingStackWithModule } from '@lafken/resolver';
import { Testing } from 'cdktn';
import { describe, expect, it, vi } from 'vitest';
import { Api, Get, Post } from '../main';
import { Event } from '../main/event';
import { PathParam } from '../main/request';
import { ApiResolver } from './resolver';
import { InternalRestApi } from './rest-api/internal/internal';

vi.mock('@lafken/resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lafken/resolver')>();
  return {
    ...actual,
    LambdaHandler: vi.fn().mockImplementation(function (this: any) {
      this.arn = 'test-function';
      this.invokeArn = 'invokeArn';
    }),
  };
});

describe('Api Resolver', () => {
  enableBuildEnvVariable();
  it('should create a new rest api with default properties in before create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    await resolver.beforeCreate(module as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(InternalRestApi, {
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

    expect(synthesized).toHaveResourceWithProperties(InternalRestApi, {
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

    expect(synthesized).toHaveResourceWithProperties(InternalRestApi, {
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
    await expect(resolver.create(module, TestApi)).rejects.toThrow();
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

  it('should create method settings resources for each stage in after create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api()
    class TestApi {
      @Get({
        path: '/test',
        methodSettings: {
          cachingEnabled: true,
          cacheTtlInSeconds: 300,
          metricsEnabled: true,
          loggingLevel: 'info',
          throttlingRateLimit: 100,
          throttlingBurstLimit: 50,
          unauthorizedCacheControlHeaderStrategy: 'succeed_with_response_header',
        },
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'test/GET',
      stage_name: 'api',
      settings: {
        caching_enabled: true,
        cache_ttl_in_seconds: 300,
        metrics_enabled: true,
        logging_level: 'INFO',
        throttling_rate_limit: 100,
        throttling_burst_limit: 50,
        unauthorized_cache_control_header_strategy: 'SUCCEED_WITH_RESPONSE_HEADER',
      },
    });
  });

  it('should not create method settings resources when no method declares them', async () => {
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

    expect(synthesized).not.toHaveResource(ApiGatewayMethodSettings);
  });

  it('should create wildcard method settings from the rest api config', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
        methodSettings: {
          metricsEnabled: true,
          loggingLevel: 'error',
        },
      },
    });

    @Api({ apiGatewayName: 'test' })
    class TestApi {
      @Get({ path: '/test' })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: '*/*',
      stage_name: 'dev',
      settings: { metrics_enabled: true, logging_level: 'ERROR' },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: '*/*',
      stage_name: 'prod',
      settings: { metrics_enabled: true, logging_level: 'ERROR' },
    });
  });

  it('should let a stage override the rest api wildcard method settings', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [
          { stageName: 'dev' },
          { stageName: 'prod', methodSettings: { loggingLevel: 'info' } },
        ],
        methodSettings: {
          loggingLevel: 'error',
        },
      },
    });

    @Api({ apiGatewayName: 'test' })
    class TestApi {
      @Get({ path: '/test' })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: '*/*',
      stage_name: 'dev',
      settings: { logging_level: 'ERROR' },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: '*/*',
      stage_name: 'prod',
      settings: { logging_level: 'INFO' },
    });
  });

  it('should keep the wildcard settings out of the stage resource', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'prod', methodSettings: { metricsEnabled: true } }],
      },
    });

    @Api({ apiGatewayName: 'test' })
    class TestApi {
      @Get({ path: '/test' })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    const stackJson = JSON.parse(synthesized);
    const [stageResource] = Object.values<Record<string, unknown>>(
      stackJson.resource.aws_api_gateway_stage
    );

    expect(stageResource).not.toHaveProperty('method_settings');
    expect(stageResource).not.toHaveProperty('methodSettings');
  });

  it('should apply a single method settings object to every stage', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
      },
    });

    @Api({ apiGatewayName: 'test' })
    class TestApi {
      @Get({
        path: '/test',
        methodSettings: { metricsEnabled: true },
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'test/GET',
      stage_name: 'dev',
      settings: { metrics_enabled: true },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'test/GET',
      stage_name: 'prod',
      settings: { metrics_enabled: true },
    });
  });

  it('should create method settings only on the stages referenced by array entries', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
      },
    });

    @Api({ apiGatewayName: 'test' })
    class TestApi {
      @Get({
        path: '/test',
        methodSettings: [
          {
            stageName: 'prod',
            metricsEnabled: true,
            loggingLevel: 'info',
          },
        ],
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'test/GET',
      stage_name: 'prod',
      settings: { metrics_enabled: true, logging_level: 'INFO' },
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'test/GET',
      stage_name: 'dev',
    });
  });

  it('should throw when method settings reference a stage that is not configured', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api()
    class TestApi {
      @Get({
        path: '/test',
        methodSettings: [{ stageName: 'nope', metricsEnabled: true }],
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await expect(resolver.afterCreate(stack as AppStack)).rejects.toThrow(
      /reference stage "nope" but that stage is not configured/
    );
  });

  it('should create concrete method settings for a class level config', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
      },
    });

    @Api({
      apiGatewayName: 'test',
      path: '/users',
      methodSettings: {
        metricsEnabled: true,
        loggingLevel: 'info',
      },
    })
    class TestApi {
      @Get({ path: '/list' })
      listHandler() {}

      @Post({ path: '/create' })
      createHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'dev',
      settings: { metrics_enabled: true, logging_level: 'INFO' },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'prod',
      settings: { metrics_enabled: true, logging_level: 'INFO' },
    });
  });

  it('should create one method settings resource per handler', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api({
      methodSettings: {
        metricsEnabled: true,
      },
    })
    class TestApi {
      @Get({ path: '/a' })
      aHandler() {}

      @Post({ path: '/b' })
      bHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    const stackJson = JSON.parse(synthesized);
    const settingsResources = Object.values<{ method_path: string }>(
      stackJson.resource.aws_api_gateway_method_settings || {}
    );

    const handlerResources = settingsResources.filter(
      ({ method_path }) => method_path === 'a/GET' || method_path === 'b/POST'
    );

    expect(handlerResources).toHaveLength(2);
  });

  it('should apply class level settings to handlers below the class base path', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api({
      path: '/users',
      methodSettings: {
        metricsEnabled: true,
      },
    })
    class TestApi {
      @Get({ path: '/' })
      baseHandler() {}

      @Get({ path: '/list' })
      listHandler() {}

      @Post({ path: '/create' })
      createHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/GET',
      settings: { metrics_enabled: true },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      settings: { metrics_enabled: true },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/create/POST',
      settings: { metrics_enabled: true },
    });
  });

  it('should scope class level settings inherited by a handler to the declared stages', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
      },
    });

    @Api({
      apiGatewayName: 'test',
      path: '/users',
      methodSettings: [{ stageName: 'prod', cachingEnabled: true }],
    })
    class TestApi {
      @Get({ path: '/list' })
      listHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'prod',
      settings: { caching_enabled: true },
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'dev',
    });
  });

  it('should throw when the same method path is declared twice for a stage', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api()
    class TestApi {
      @Get({
        path: '/test',
        methodSettings: [
          { stageName: 'api', metricsEnabled: true },
          { stageName: 'api', cachingEnabled: true },
        ],
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await expect(resolver.afterCreate(stack as AppStack)).rejects.toThrow(
      /declare "test\/GET" more than once on stage "api"/
    );
  });

  it('should create stage scoped concrete method settings for a class level array config', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        stages: [{ stageName: 'dev' }, { stageName: 'prod' }],
      },
    });

    @Api({
      apiGatewayName: 'test',
      path: '/users',
      methodSettings: [{ stageName: 'prod', cachingEnabled: true }],
    })
    class TestApi {
      @Get({ path: '/list' })
      listHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'prod',
      settings: { caching_enabled: true },
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      stage_name: 'dev',
    });
  });

  it('should let method level settings override class level settings', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    @Api({
      path: '/users',
      methodSettings: {
        metricsEnabled: true,
      },
    })
    class TestApi {
      @Get({
        path: '/list',
        methodSettings: { cachingEnabled: true },
      })
      listHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      settings: { caching_enabled: true },
    });

    // The handler declares its own settings, so it does not inherit the class ones.
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/list/GET',
      settings: { metrics_enabled: true },
    });
  });

  it('should keep greedy path params in method settings paths', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    class GreedyUserPath {
      @PathParam()
      user: string;
    }

    @Api({
      path: '/users',
    })
    class TestApi {
      @Get({
        path: '{user+}',
        methodSettings: { cachingEnabled: true },
      })
      listHandler(@Event(GreedyUserPath) _e: GreedyUserPath) {}

      @Post({
        path: '{user+}',
        methodSettings: { metricsEnabled: true },
      })
      postHandler(@Event(GreedyUserPath) _e: GreedyUserPath) {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/{user+}/GET',
      settings: { caching_enabled: true },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: 'users/{user+}/POST',
      settings: { metrics_enabled: true },
    });
  });

  it('should build class level concrete settings for greedy paths', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver();

    class GreedyUserPath {
      @PathParam()
      user: string;
    }

    @Api({
      path: '{user+}',
      methodSettings: {
        metricsEnabled: true,
      },
    })
    class TestApi {
      @Get({ path: '/' })
      getHandler(@Event(GreedyUserPath) _e: GreedyUserPath) {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApi);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodSettings, {
      method_path: '{user+}/GET',
      settings: { metrics_enabled: true },
    });
  });

  it('should call extends method in after create hook', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const extend = vi.fn();

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

  it('should create a rest api policy when private endpoint with vpcEndpointIds is provided', async () => {
    const { stack, module } = setupTestingStackWithModule();

    const resolver = new ApiResolver({
      restApi: {
        name: 'test',
        endpointConfiguration: {
          type: 'private',
          vpcEndpointIds: ['vpce-12345678'],
        },
      },
    });

    @Api({
      apiGatewayName: 'test',
    })
    class TestApiPrivate {
      @Get({
        path: '/test',
      })
      testHandler() {}
    }

    await resolver.beforeCreate(module as AppStack);
    await resolver.create(module, TestApiPrivate);
    await resolver.afterCreate(stack as AppStack);
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayRestApiPolicy, {
      policy: expect.stringContaining('vpce-12345678'),
    });
  });
});
