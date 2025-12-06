import { createModule } from '@alicanto/main';

// import { GreetingEvent } from './greeting.event';

// import { GreetingSchedule } from './greeting.schedule';

// import { GreetingApi } from './greeting.api';

// import { QueueIntegration } from './greeting.api.queue';
// import { GreetingQueues } from './greeting.queue';
import { GreetingStepFunction } from './greeting.state-machine';

const greetingModule = createModule({
  name: 'greeting',
  resources: [
    GreetingStepFunction,
    // GreetingApi,
    // GreetingSchedule,
    // GreetingEvent,
    // QueueIntegration,
    // GreetingQueues,
    /*BucketIntegration, GreetingApi, DynamoIntegration*/
  ],
});

export default greetingModule;
