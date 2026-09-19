import { TerraformStack, Testing } from 'cdktn';
import { Construct } from 'constructs';
import { rootScope } from '../resources/root-scope/root-scope';

export const setupTestingStack = () => {
  const app = Testing.app();
  const stack = new TerraformStack(app, 'testing-stack');

  rootScope.set(stack);

  return {
    app,
    stack,
  };
};

export const setupTestingStackWithModule = () => {
  const { app, stack } = setupTestingStack();

  class Module extends Construct {
    id = 'test';
  }

  const module = new Module(stack, 'testing');

  return {
    app,
    stack,
    module,
  };
};
