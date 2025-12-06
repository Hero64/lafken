# @alicanto/main

This is the core entry point of an Alicanto application. Internally, it initializes the @cdktf/provider-aws, allowing you to register resolvers, modules, and global configuration. It orchestrates the creation of all the infrastructure required for a fully serverless application.

## Installation


```bash
npm  install  @alicanto/main
```


## Features


### createApp


This is the main entry point of the application. It allows you to register the resolvers required for processing your infrastructure, as well as define global configuration.

Creating an application is straightforward.

```ts
createApp({
  name: 'awesome',
  modules: [],
  resolvers: [],
  globalConfig: {
    tags: {
      'global-tag': 'awesome-tag',
    },
  },
  extend() {
    // extend your application
  },
});
```

Just give your application a name, import your resolvers—such as `ApiResolver` or `BucketResolver`—add your modules, and you’re ready to go.

### createModule

Each module contains one or more resources. With a module, you can import your classes and define the resources that will be processed by a resolver.  
Additionally, you can apply global configuration to all resources managed by the module.

```ts
createModule({
  name: 'awesome-module',
  resources: [/** API, QUEUE, SCHEDULE */],
  globalConfig: {
    lambda: {
      services: ['cloudwatch', 's3', 'sqs', 'dynamodb'],
    },
  },
});
```

This allows you to group related functionality, organize your infrastructure, and apply shared settings across multiple resources.
