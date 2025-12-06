import { Bucket } from '@alicanto/bucket/main';

@Bucket({
  name: 'alicanto-example-documents',
  forceDestroy: true,
  eventBridgeEnabled: true,
})
export class DocumentBucket {}
