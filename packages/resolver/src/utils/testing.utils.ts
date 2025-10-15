import { TerraformStack, Testing } from 'cdktf';

export const setupTestingStack = () => {
  const app = Testing.app();
  const stack = new TerraformStack(app, 'testing-stack');

  return {
    app,
    stack,
  };
};
