/**
 * Type declarations for Alicanto framework resources
 * This file extends the interfaces from @alicanto/common to define
 * the available resources for this specific application
 */

declare module '@alicanto/common' {
  interface ModulesAvailable {
    greeting: {
      StateMachine: {
        GreetingStepFunction: true;
      };
      Queue: {
        'greeting-standard-queue': true;
      };
    };
  }

  interface BucketAvailable {
    'alicanto-example-documents': true;
  }

  interface ApiRestAvailable {
    ExampleApi: boolean;
  }

  interface ApiAuthorizerAvailable {
    'api-key-auth': true;
    'cognito-auth': true;
  }

  interface DynamoTableAvailable {
    clients: true;
  }

  interface AuthAvailable {
    'example-user-pool': true;
  }
}

export {};
