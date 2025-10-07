import { ApiResolver } from '@alicanto/api/resolver';
import { createApp } from '@alicanto/main';
import GreetingStack from './modules/greeting/greeting.module';

createApp({
  globalConfig: {
    lambda: {
      env: {
        aaa: 'bbb',
      },
    },
  },
  name: 'example',
  modules: [GreetingStack],
  resolvers: [
    new ApiResolver({
      restApi: {
        name: 'ExampleApi',
      },
      // auth: {
      //   authorizers: [ExampleCustomAuthorizer],
      //   defaultAuthorizerName: 'ExampleCustomAuthorizer',
      // },
    }),
    // new StateMachineResolver(),
    // new EventResolver(),
  ],
});
