import { createModule } from '@alicanto/main';
import { GreetingApi } from './greeting.api';

const greetingModule = createModule({
  name: 'greeting',
  resources: [GreetingApi],
});

export default greetingModule;
