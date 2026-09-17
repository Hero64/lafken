import 'reflect-metadata';
import { LambdaArgumentTypes, LambdaReflectKeys } from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { Context, Event } from './event';

describe('Event/Context decorators', () => {
  it('registers the event argument type', () => {
    class Handler {
      onMessage(@Event() _event: unknown) {}
    }

    const args = Reflect.getMetadata(LambdaReflectKeys.arguments, Handler.prototype);

    expect(args.onMessage).toEqual([LambdaArgumentTypes.event]);
  });

  it('registers the context argument type', () => {
    class Handler {
      onMessage(@Context() _context: unknown) {}
    }

    const args = Reflect.getMetadata(LambdaReflectKeys.arguments, Handler.prototype);

    expect(args.onMessage).toEqual([LambdaArgumentTypes.context]);
  });

  it('registers both event and context in declaration order', () => {
    class Handler {
      onMessage(@Event() _event: unknown, @Context() _context: unknown) {}
    }

    const args = Reflect.getMetadata(LambdaReflectKeys.arguments, Handler.prototype);

    expect(args.onMessage).toEqual([
      LambdaArgumentTypes.event,
      LambdaArgumentTypes.context,
    ]);
  });
});
