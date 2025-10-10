import { createModule } from '@alicanto/main';
import { GreetingApi } from './greeting.api';
import { BucketIntegration } from './greeting.api.s3';

const greetingModule = createModule({
  name: 'greeting',
  resources: [BucketIntegration, GreetingApi],
});

export default greetingModule;
