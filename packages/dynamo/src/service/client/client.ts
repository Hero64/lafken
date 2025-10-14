import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk';

const getClientConfig = () => {
  const mockEndpoint = process.env.MOCK_DYNAMODB_ENDPOINT;
  if (mockEndpoint) {
    return {
      endpoint: mockEndpoint,
      sslEnabled: false,
      region: 'local',
    };
  }

  return {};
};

export const client = new DynamoDBClient(getClientConfig());

export const getClientWithXRay = () => {
  return captureAWSv3Client(client);
};
