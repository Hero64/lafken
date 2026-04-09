# @lafken/main

## 0.10.2

### Patch Changes

- fixes lambda name, models and functions
- Updated dependencies
  - @lafken/common@0.10.2
  - @lafken/resolver@0.10.2

## 1.0.0

### Minor Changes

- - Fix role assignments in private API.
  - Fix default `ipAddressType` in private API.
  - Fix peer dependency declarations.

  - Add support for `oneOf`, `anyOf`, `allOf`, and `not` combinators in API Gateway models.
  - Add support for `additionalProperties` in API Gateway models.
  - Add `VelocityParam` helper.
  - Add API Gateway default gateway responses.
  - Harden infrastructure definitions per Checkov policy checks.

### Patch Changes

- Updated dependencies
  - @lafken/common@0.10.0
  - @lafken/resolver@1.0.0

## 0.9.0

### Minor Changes

- - Add support for exposing resource properties through SSM parameters and Terraform outputs.
  - Add support for instantiating resources created in other stacks.
  - Add support for resolving variables from SSM.
  - Add support for running Lambdas inside a VPC.
  - Move global environment variables to module and app aspects.
  - API: add support for endpointConfiguration.

  - Fix and improve TypeScript interfaces.
  - Update package dependencies.
  - Replace SHA-1 with SHA-256.

### Patch Changes

- Updated dependencies
  - @lafken/common@0.9.0
  - @lafken/resolver@0.9.0

## 0.8.1

### Patch Changes

- The `exec` method is removed when executing a query on DynamoDB
- Updated dependencies
  - @lafken/common@0.8.1
  - @lafken/resolver@0.8.1

## 0.8.0

### Minor Changes

- - Replace `Payload` decorator with `ApiRequest` and `RequestObject`
  - Split `Param` decorator into typed decorators: `BodyParam`, `QueryParam`, `HeaderParam`, and `PathParam`
  - Replace `Response` decorator with `ApiResponse` and `ResponseObject`
  - Add validation support for body parameters

  - Fix support for returning primitive response values

  ***

  - Add support for extending table functionality
  - Rename `Model` decorator to `Table`
  - Add ORM validations

  - Export repository function type

  ***

  - Add support for extending bucket functionality

  - Export repository function type

  ***

  - Add support for using a service ARN

  - Fix service execution output
  - Fix lambda existence validation

  ***

  - Fix empty asset creation

  ***

  - Remove callback support

  - Fix field handling

  ***

  - Update READMEs and JSDoc documentation
  - Add new examples

### Patch Changes

- Updated dependencies
  - @lafken/common@0.8.0
  - @lafken/resolver@0.8.0

## 0.7.0

### Minor Changes

- Migrate cdftf to cdk-terrain

### Patch Changes

- Updated dependencies
  - @lafken/common@0.7.0
  - @lafken/resolver@0.7.0

## 0.6.4

### Patch Changes

- fix: state-machine schema generator
- Updated dependencies
  - @lafken/common@0.6.4
  - @lafken/resolver@0.6.4

## 0.6.3

### Patch Changes

- fix export module
- Updated dependencies
  - @lafken/common@0.6.3
  - @lafken/resolver@0.6.3

## 0.6.2

### Patch Changes

- add package description
- Updated dependencies
  - @lafken/common@0.6.2
  - @lafken/resolver@0.6.2

## 0.1.1

### Patch Changes

- upgrade types field in package.json
- Updated dependencies
  - @lafken/common@0.1.1
  - @lafken/resolver@0.1.1

## 0.1.0

### Minor Changes

- initial release

### Patch Changes

- Updated dependencies
  - @lafken/resolver@0.1.0
  - @lafken/common@0.1.0
