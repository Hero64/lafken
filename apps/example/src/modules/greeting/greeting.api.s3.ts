import {
  Api,
  type BucketIntegrationOption,
  type BucketIntegrationResponse,
  Delete,
  Event,
  Get,
  IntegrationOptions,
  Post,
} from '@alicanto/api/main';
import { S3UploadFileEvent } from './greeting.field';

@Api({
  path: 'bucket',
})
export class BucketIntegration {
  @Get({
    integration: 'bucket',
    action: 'Download',
  })
  get(
    @IntegrationOptions() { getResourceValue }: BucketIntegrationOption
  ): BucketIntegrationResponse {
    return {
      bucket: getResourceValue('alicanto-example-documents', 'id'),
      object: 'new.json',
    };
  }

  @Post({
    integration: 'bucket',
    action: 'Upload',
    path: '/{fileName}',
  })
  upload(
    @Event(S3UploadFileEvent) e: S3UploadFileEvent,
    @IntegrationOptions() { getResourceValue }: BucketIntegrationOption
  ): BucketIntegrationResponse {
    return {
      bucket: getResourceValue('alicanto-example-documents', 'id'),
      object: e.fileName,
    };
  }

  @Delete({
    integration: 'bucket',
    action: 'Delete',
    path: '/{fileName}',
  })
  delete(
    @Event(S3UploadFileEvent) e: S3UploadFileEvent,
    @IntegrationOptions() { getResourceValue }: BucketIntegrationOption
  ): BucketIntegrationResponse {
    return {
      bucket: getResourceValue('alicanto-example-documents', 'id'),
      object: e.fileName,
    };
  }
}
