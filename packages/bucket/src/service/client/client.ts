import { S3Client } from '@aws-sdk/client-s3';
import { captureAWSv3Client } from 'aws-xray-sdk';

export const client = new S3Client();

export const getClientWithXRay = () => {
  return captureAWSv3Client(client);
};
