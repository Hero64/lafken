import { ApiGatewayIntegration } from '@cdktn/provider-aws/lib/api-gateway-integration';
import { ApiGatewayIntegrationResponse } from '@cdktn/provider-aws/lib/api-gateway-integration-response';
import { ApiGatewayMethodResponse } from '@cdktn/provider-aws/lib/api-gateway-method-response';
import { enableBuildEnvVariable } from '@lafken/common';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import {
  Api,
  ApiRequest,
  ApiResponse,
  BodyParam,
  Event,
  Get,
  Post,
  QueryParam,
  ResField,
} from '../../../../../../main';
import {
  initializeMethod,
  setupInternalTestingRestApi,
} from '../../../../../utils/testing.utils';

describe('Mock integration', () => {
  enableBuildEnvVariable();

  @ApiRequest()
  class MockRequest {
    @QueryParam()
    other: string;

    @BodyParam()
    name: string;
  }

  @ApiRequest()
  class OptionalMockRequest {
    @QueryParam()
    keep: string;

    @QueryParam({ required: false })
    maybe: string;
  }

  @ApiResponse({ defaultCode: 202 })
  class CustomMockResponse {
    @ResField()
    foo: string;
  }

  @Api()
  class TestingApi {
    @Get({
      integration: 'mock',
    })
    mockStatic() {
      return {
        foo: 'foo',
        count: 5,
        enabled: true,
      };
    }

    @Post({
      integration: 'mock',
    })
    mockWithEvent(@Event(MockRequest) e: MockRequest) {
      return {
        foo: 'foo',
        other: e.other,
        name: e.name,
      };
    }

    @Post({
      integration: 'mock',
      response: CustomMockResponse,
    })
    mockWithResponse() {
      return {
        foo: 'foo',
      };
    }

    @Post({
      integration: 'mock',
    })
    mockWithOptional(@Event(OptionalMockRequest) e: OptionalMockRequest) {
      return {
        foo: 'foo',
        keep: e.keep,
        maybe: e.maybe,
      };
    }
  }

  it('should create a mock integration with static literal values', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'mockStatic');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'MOCK',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': '{"statusCode": 200}',
      },
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '200',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '200',
      response_templates: {
        'application/json':
          '{ #set($comma = "") $comma"foo": "foo" #set($comma = ",")$comma"count": 5 #set($comma = ",")$comma"enabled": true #set($comma = ",") }',
      },
    });
  });

  it('should create a mock integration resolving event params', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'mockWithEvent');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'MOCK',
      passthrough_behavior: 'WHEN_NO_TEMPLATES',
      request_templates: {
        'application/json': '{"statusCode": 201}',
      },
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '201',
      response_templates: {
        'application/json':
          '{ #set($comma = "") $comma"foo": "foo" #set($comma = ",")$comma"other": "$input.params(\'other\')" #set($comma = ",")$comma"name": "$input.path(\'$.name\')" #set($comma = ",") }',
      },
    });
  });

  it('should use the status code defined in the response model', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'mockWithResponse');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegration, {
      type: 'MOCK',
      request_templates: {
        'application/json': '{"statusCode": 202}',
      },
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayMethodResponse, {
      status_code: '202',
    });

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '202',
      response_templates: {
        'application/json': '{ #set($comma = "") $comma"foo": "foo" #set($comma = ",") }',
      },
    });
  });

  it('should guard non-required attributes with an #if block', async () => {
    const { restApi, stack } = setupInternalTestingRestApi();

    await initializeMethod(restApi, stack, TestingApi, 'mockWithOptional');

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayIntegrationResponse, {
      status_code: '201',
      response_templates: {
        'application/json':
          '{ #set($comma = "") $comma"foo": "foo" #set($comma = ",")$comma"keep": "$input.params(\'keep\')" #set($comma = ",")#if($input.params(\'maybe\') && $input.params(\'maybe\') != "") $comma"maybe": "$input.params(\'maybe\')" #set($comma = ",") #end  }',
      },
    });
  });
});
