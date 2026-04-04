import { ApiGatewayGatewayResponse } from '@cdktn/provider-aws/lib/api-gateway-gateway-response';
import { Testing } from 'cdktn';
import { describe, expect, it } from 'vitest';
import { setupInternalTestingRestApi } from '../../utils/testing.utils';

describe('RestApiBase - addApiGatewayResponse', () => {
  it('should not create any gateway response when defaultResponses is not provided', () => {
    const { stack } = setupInternalTestingRestApi({});
    const synthesized = Testing.synth(stack);

    expect(synthesized).not.toHaveResource(ApiGatewayGatewayResponse);
  });

  it('should create a gateway response for a single response type', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
      status_code: '401',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Unauthorized' }),
      },
    });
  });

  it('should create multiple gateway responses for multiple response types', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
        badRequestBody: { message: 'Bad Request' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
      status_code: '401',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Unauthorized' }),
      },
    });
    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'BAD_REQUEST_BODY',
      status_code: '400',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Bad Request' }),
      },
    });
  });

  it('should skip response types with falsy values', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        unauthorized: { message: 'Unauthorized' },
        badRequestBody: undefined as any,
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'UNAUTHORIZED',
    });
    expect(synthesized).not.toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'BAD_REQUEST_BODY',
    });
  });

  it('should create a gateway response without status code for default4xx type', () => {
    const { stack } = setupInternalTestingRestApi({
      defaultResponses: {
        default4xx: { message: 'Client Error' },
      },
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(ApiGatewayGatewayResponse, {
      response_type: 'DEFAULT_4XX',
      response_templates: {
        'application/json': JSON.stringify({ message: 'Client Error' }),
      },
    });
  });
});
