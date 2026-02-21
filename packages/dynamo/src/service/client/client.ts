import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk';

export const client = new DynamoDBClient();

export const getClientWithXRay = () => {
  return captureAWSv3Client(client);
};
