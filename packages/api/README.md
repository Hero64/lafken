# @alicanto/api

`@alicanto/api` helps you build AWS REST APIs in the simplest possible way.
It provides decorators and helper functions so you can declare endpoints, events, and integrations with minimal code — while Alicanto handles the AWS infrastructure for you.


## Installation

```bash
npm install @alicanto/api
```

## Configuration

The first step is to add a resolver to your application. To do this, import ApiResolver from @alicanto/api/resolver and include it in the resolvers array by instantiating the class: new ApiResolver({}).

If you don’t provide any configuration, a default API will be created using minimal settings. By passing properties to the resolver, you can customize the API name, CORS options, authorizers, supported media types, and more. You can also extend the API’s capabilities using CDKTF.

```typescript
import { ApiResolver } from '@alicanto/api/resolver';

createApp({
  name: 'awesome-app',
  resolvers: [
    new ApiResolver({
      restApi: {
        name: 'awesome-rest-api',
        cors: {
          allowOrigins: true,
        },
        stage: {
          stageName: 'dev',
        },
      },
    }),
  ],
  ...
});
```

ApiResolver supports multiple configuration options and allows you to create multiple APIs within the same application.

Next, to initialize the resolver, you need to import the classes decorated with the @Api decorator into your modules. This will automatically create the required AWS resources.

```typescript
@Api({
  path: '/greeting'
})
class GreetingApi {
  @Get()
  sayHello() {
    return 'Hello'
  }
}

const greetingModule = createModule({
  name: 'greeting',
  resources: [
    GreetingApi
  ]
});

```

## Features

### HTTP Resources
Create HTTP resources using the `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, and `@Any` decorators. These endpoints can directly invoke Lambda functions or integrate with AWS services.

```typescript
import { Post } from '@alicanto/api/main';
//...
@Post({
  path: '{name}'
})
sayHello () {
  return  'hello'
}
```
### Event/Payload
A decorated method can receive an event payload using the `@Event` decorator, which takes a class annotated with the `@Payload` decorator. The `@Payload`/`@Param` decorators allow you to specify where each property comes from—body, path, query, headers, or context—binding those values to the event and automatically generating a fully resolved Velocity `requestTemplate` internally.
```typescript
import { Post, Payload, Param, Event } from '@alicanto/api/main';
// ...
@Payload()
class HelloPayload {
  @Param({
    source: 'path',
  })
  id: number;

  @Param({
    source: 'body',
  })
  name: string;
}
// ...
@Post({
  path: '{id}',
})
sayHello(@Event(HelloPayload) e: HelloPayload) {
  return `hello ${e.name}`;
}
```
### AWS integrations
You can integrate an HTTP method directly with an AWS service without using a Lambda function. Each method decorator (`@Get`, `@Post`, `@Put`, etc.) can include an `integration` property, which accepts one of the following values: `bucket`, `dynamodb`, `queue`, or `state-machine`, along with an `action` that represents the operation to perform (which varies depending on the integration type).  
The response format also depends on the type of integration.
```typescript
import {
  Get,
  IntegrationOptions,
  BucketIntegrationOption,
  BucketIntegrationResponse
} from '@alicanto/api/main';
//...
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
```

Integrations can also receive the `@IntegrationOptions` decorator, which provides helper functions for building the integration. The `getResourceValue` function allows you to reference values from resources created by other resolvers and pass them into the integration configuration.

### Responses
Although you can return values without explicitly defining a response type, you can also attach one or multiple custom responses to each HTTP method. This allows you to generate `responseModels` and `responseTemplates` for every case.

To do this, decorate a class with the `@Response` decorator and pass that class to the method via the `response` property. By default, the payload of your response must match the structure defined in the class.  
However, you can specify additional responses by mapping an HTTP status code to a class (or to `true` if the response does not return a payload).

```typescript
@Payload()
export class Res404 {
  @Field()
  foo: string;
}

@Payload()
export class Res307 {
  @Field()
  bar: string;
}

@Response({
  responses: {
    404: Res404,
    307: Res307,
    204: true,
  },
})
export class GreetingResponse {
  @Field()
  fullName: string;

  @Field()
  id: number;
}

@Post({
  response: GreetingResponse,
})
sayHello(): GreetingResponse {
  if (/* logic for 404 response */) {
    response<Res404>(404, {
      foo: '404',
    });
  }

  if (/* logic for 307 response */) {
    response<Res307>(307, {
      bar: '307',
    });
  }

  if (/* logic for 204 response */) {
    response(204);
  }

  return {
    fullName: 'Alicanto',
    id: 1,
  };
}
```

The `response` function allows you to return a response that will be interpreted by API Gateway.

If you don’t explicitly specify a status code, a default one will be used: for example, a `POST` request will default to `201`, while most other methods default to `200`.  
This behavior can be overridden by setting `defaultCode` in the `@Response` decorator:

```typescript
@Response({
  defaultCode: 301,
  responses: {
    // ...
  },
})
```

If the method does not define a `response` property, a default set of status codes will be generated automatically—typically the appropriate `20X` responses along with standard `400` and `500` error responses.

### Authorizers

To add authorization to your endpoints, Alicanto supports three types of authorizers: `api-key`, `cognito`, and `custom`. These options allow you to apply different levels and styles of security to your application, depending on your needs.

#### ApiKeyAuthorizer
Allows you to specify the usage plans and API keys that will be applied to different endpoints in the application.

To create an API key authorizer, you need to decorate a class with the `@ApiKeyAuthorizer` decorator, which accepts the necessary configuration properties.

```typescript
@ApiKeyAuthorizer({
  name: 'api-key-auth',
  defaultKeys: ['awesome-key'],
})
export class ApiKeyAuth {}
```

The `defaultKeys` property allows you to create default API keys that will be used by the application.

#### CustomAuthorizer

A custom authorizer allows you to implement your own authentication logic, providing greater flexibility when validating access. To create a custom authorizer, decorate a class with the `@CustomAuthorizer` decorator and provide the required configuration properties.  
Additionally, the class must include a method decorated with `@AuthorizerHandler`, which acts as the entry point for validating requests.

```typescript
import {
  type AuthorizationHandlerEvent,
  AuthorizerHandler,
  type AuthorizerResponse,
  CustomAuthorizer,
} from '@alicanto/api/main';

@CustomAuthorizer({
  name: 'AwesomeCustomAuthorizer',
  header: 'Authorization',
})
export class AwesomeCustomAuthorizer {
  @AuthorizerHandler()
  handler(_e: AuthorizationHandlerEvent): AuthorizerResponse {
    return {
      allow: true,
      principalId: 'example@example.com',
    };
  }
}
```

The handler receives an `AuthorizationHandlerEvent`, which includes all information available in the `APIGatewayRequestAuthorizerEvent` (from Lambda types), along with an array of permissions that can be configured per HTTP method if needed.  
The method must return an `AuthorizerResponse`, indicating whether the request is authorized (`allow: true`) and specifying the authorized principal.

#### CognitoAuthorizer
Enables integration with a Cognito User Pool to authorize your HTTP methods. Before using it, you must first configure `@alicanto/auth`.  
To create a Cognito authorizer, decorate a class with the `@CognitoAuthorizer` decorator and provide the required properties

```typescript
import { CognitoAuthorizer } from '@alicanto/api/main';

@CognitoAuthorizer({
  userPool: 'example-user-pool',
  name: 'cognito-auth',
})
export class CognitoAuth {}
```

#### Adding an Authorizer to an API
Once one or more authorizer classes have been created, you need to pass them to the `AuthResolver` so they can be used internally by the API.

```typescript
new ApiResolver({
  restApi: {
    name: 'awesome-rest-api',
    auth: {
      authorizers: [
        AwesomeApiKey,
        AwesomeCustomAuth,
      ],
      defaultAuthorizerName: 'AwesomeCustomAuth',
    },
  },
}),
```

The `defaultAuthorizerName` property specifies the authorizer that will be applied to all methods by default. This setting can be overridden at both the resource level and the individual method level if needed.

#### Using an Authorizer
To use an authorizer other than the default, both the `@Api` decorator and the HTTP method decorators (`@Post`, `@Get`, `@Put`, etc.) support an `auth` property.  
This property allows you to specify an `authorizerName`, which must match the name configured for the authorizer you want to use.

To apply an authorizer to every method within a class, you can set the `auth` property directly on the `@Api` decorator.
```
@Api({
  auth: {
    authorizerName: 'AwesomeApiKey',
  },
})
// ...
```
To apply an authorizer only to a specific method, define the `auth` property directly inside that method’s decorator. This overrides both the API-level and class-level authorizer settings.
```typescript
@Get({
  auth: {
    authorizerName: 'AwesomeCustomAuth',
  },
})
// ...
```

To disable authorization for a specific method or API, simply set the `auth` property to `false`

#### Adding Scopes to an Authorizer
Both the Cognito authorizer and the custom authorizer support scopes, which are simply an array of strings passed to the authorizer.  
For custom authorizers, these scopes are delivered to the handler through the `permissions` property.

```typescript
@Get({
  auth: {
    authorizerName: 'AwesomeCustomAuth',
    scopes: ['user:delete', 'user:read'],
  },
})
//...
```

These scopes allow you to define fine-grained authorization rules for each method.

### Extending API Capabilities

The `ApiResolver` allows you to enhance and customize the generated API by providing an `extend` function.  
This function receives the created API instance, enabling you to modify or augment its configuration using CDKTF—for example, adding a custom domain or adjusting internal settings.

```typescript
new ApiResolver({
  restApi: {
    name: 'awesome-rest-api',
  },
  extend: ({ api, scope }) => {
    // add a custom domain
  },
}),
```

This mechanism provides maximum flexibility, allowing you to integrate advanced AWS resources or apply custom infrastructure logic directly on top of the generated API.
