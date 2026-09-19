import type { Construct } from 'constructs';

class RootScope {
  private scope?: Construct;

  set(scope: Construct) {
    this.scope = scope;
  }

  get(): Construct {
    if (!this.scope) {
      throw new Error(
        'Root scope not initialized — createApp() must run before resolving SSM references.'
      );
    }
    return this.scope;
  }
}

export const rootScope = new RootScope();
