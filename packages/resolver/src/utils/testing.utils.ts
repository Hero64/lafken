import { TerraformStack, Testing } from 'cdktf';
import { Construct } from 'constructs';

export const setupTestingStack = () => {
  const app = Testing.app();
  const stack = new TerraformStack(app, 'testing-stack');

  return {
    app,
    stack,
  };
};

export const setupTestingStackWithModule = () => {
  const { app, stack } = setupTestingStack();

  class Module extends Construct {
    id: 'test';
  }

  const module = new Module(stack, 'testing');

  return {
    app,
    stack,
    module,
  };
};
