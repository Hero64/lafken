import { Api, type BucketIntegrationResponse, Get } from '@alicanto/api/main';

@Api({
  path: 'bucket',
})
export class BucketIntegration {
  @Get({
    integration: 'bucket',
    action: 'Download',
  })
  get(): BucketIntegrationResponse {
    return {
      bucket: 'algo',
      object: 'nuevo.json',
    };
  }
}
