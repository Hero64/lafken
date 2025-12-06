// import { AuthResolver } from '@alicanto/auth/resolver';

// import { ApiResolver } from '@alicanto/api/resolver';
// import { DynamoResolver } from '@alicanto/dynamo/resolver';
import { BucketResolver } from '@alicanto/bucket/resolver';
// import { EventRuleResolver } from '@alicanto/event/resolver';
import { createApp } from '@alicanto/main';
import { StateMachineResolver } from '@alicanto/state-machine/resolver';
// import { ScheduleResolver } from '@alicanto/schedule/resolver';
// import { Client } from './model/client.model';
import { DocumentBucket } from './bucket/documents.bucket';
// import { ApiKeyAuth } from './auth/apikey.auth';
// import { UserPoolAttributes } from './auth/attributes.auth';
// import { CognitoAuth } from './auth/cognito.auth';
// import { QueueResolver } from '@alicanto/queue/resolver';
// import { ExampleCustomAuthorizer } from './auth/custom.auth';
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
    // new ApiResolver({
    //   restApi: {
    //     name: 'ExampleApi',
    //     supportedMediaTypes: ['application/pdf', 'image/jpeg'],
    //     auth: {
    //       authorizers: [ExampleCustomAuthorizer, ApiKeyAuth, CognitoAuth],
    //       defaultAuthorizerName: 'ExampleCustomAuthorizer',
    //     },
    //   },
    // }),
    // new EventRuleResolver(),
    // new ScheduleResolver(),
    // new AuthResolver({
    //   name: 'example-user-pool',
    //   userPool: {
    //     cognitoPlan: 'essentials',
    //     attributes: UserPoolAttributes,
    //     autoVerifyAttributes: ['email'],
    //     usernameAttributes: ['email'],
    //     selfSignUpEnabled: true,
    //   },
    //   userClient: {
    //     enableTokenRevocation: true,
    //     authFlows: ['allow_user_password_auth'],
    //   },
    // }),
    // new QueueResolver(),
    new BucketResolver([DocumentBucket]),
    // new DynamoResolver([Client]),
    new StateMachineResolver(),
    // new EventResolver(),
  ],
});
