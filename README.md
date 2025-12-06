# Alicanto

Alicanto is a lightweight framework for building serverless applications on AWS with minimal infrastructure overhead.
Instead of manually orchestrating resources, Alicanto uses CDK for Terraform (CDKTF) under the hood to generate, synthesize, and manage all AWS infrastructure defined in your modules.

You focus on writing your application logic. Alicanto takes care of the infrastructure

## Features

* Simple and modular structure
* Easy creation of serverless APIs and other resources
* No infrastructure knowledge required
* Works well for small or large projects
* Extensible through modules and resolvers

## Installation

```bash
npm install @alicanto/main
```

## Quick Example

### Create an application

```ts
import { ApiResolver } from '@alicanto/api/resolver';

createApp({
  name: 'awesome-app',
  resolvers: [new ApiResolver()],
  modules: [greetingModule]
});
```

### Create a module

```ts
import { createModule } from '@alicanto/main';
import { GreetingApi } from './greeting.api';

const greetingModule = createModule({
  name: 'greeting',
  resources: [GreetingApi],
});
```

### Create a resource

```ts
export class GreetingApi {
  sayHello() {
    return 'hello';
  }
}
```

## Additional Documentation

Alicanto includes several sub-packages with their own documentation:

* Main module → 
* Core module → 
* Resolver module → 
* API Module → (link pending)
* Bucket Module → 
* Dynamo Module → 
* Queue Module → 
* Event Module → 
* State Machine Module → 
* Auth Module → 
* Schedule Module → 

## Configuration

Alicanto can be configured depending on your project needs.
More details will be added as configuration options are defined.

