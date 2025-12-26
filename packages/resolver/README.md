# @lafken/resolver

`@lafken/resolver` serves as the foundational package for building resolvers within the Lafken framework. It provides essential base classes and utilities for creating, managing, and connecting infrastructure resources, specifically focusing on AWS Lambda and IAM Role management.

## Features

### LambdaHandler

The `LambdaHandler` class simplifies the creation of AWS Lambda functions. It handles:
- **Automatic Role Creation:** Automatically generates IAM roles with necessary permissions based on the services used by the lambda.
- **Environment Management:** Manages environment variables, including resolving dependencies from other resources.
- **Context Integration:** Seamlessly integrates with application and module contexts to retrieve configuration values like runtime, timeout, and memory size.
- **Permission Management:** Easily adds invocation permissions for principals (e.g., APIGateway, Events).

```typescript
import { LambdaHandler } from '@lafken/resolver';

new LambdaHandler(scope, 'my-handler', {
  name: 'process-event',
  foldername: 'src/lambdas',
  filename: 'process-event',
  runtime: 20, // Optional override
  // ... other props
});
```

### Role

The `Role` class provides a streamlined way to create IAM roles. It includes a predefined set of permissions for common AWS services (S3, DynamoDB, SQS, etc.), making it easy to define roles with the "principle of least privilege" without writing verbose IAM policies manually.

```typescript
import { Role } from '@lafken/resolver';

new Role(scope, 'my-role', {
  name: 'service-role',
  services: ['s3', 'dynamodb'], // Grants default permissions for these services
});
```

### lambdaAssets

The `lambdaAssets` utility handles the build process for Lambda functions. It manages transpilation, bundling, and asset creation, ensuring your Lambda code is ready for deployment.

### lafkenResource

The `lafkenResource` is the base class for resources in the framework. It provides a mechanism for:
- **Global Resource Tracking:** Allows resources to be registered and accessed globally across the application.
- **Dependency Management:** Manages dependencies between resources, ensuring they are created in the correct order and configurations are fully resolved before deployment.

### Environment

Provides a mechanism to manage environment variables in order to expose resources and configuration data to Lambda functions. Environment variables are received and parsed at deployment time, making them available for use during execution.

Variables can be defined as direct static values or as SSM-backed parameters, allowing values to be resolved dynamically from AWS Systems Manager Parameter Store.

This approach enables a consistent and secure way to inject configuration, resource references, and sensitive data into Lambda functions

Supported Environment Variable Types

Environment variables can be defined as static values or resolved dynamically from AWS Systems Manager (SSM).

SSM-backed variables must follow the structure: `SSM::{TYPE}::/path/of/ssm/parameter`

Where {TYPE} defines how the parameter is resolved. The following types are supported:

STRING — Resolves an SSM String parameter

SECURE_STRING — Resolves an SSM SecureString parameter

## Usage

This package is primarily used internally by other `@lafken/*` packages (like `@lafken/api`, `@lafken/event`, etc.) to implement their specific resource resolvers. However, it can be used directly to create custom infrastructure components that adhere to the framework's patterns.
