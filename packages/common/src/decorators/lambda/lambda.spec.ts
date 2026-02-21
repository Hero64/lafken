import { describe, expect, it } from 'vitest';
import { enableBuildEnvVariable, getResourceHandlerMetadata } from '../../utils';
import { createFieldDecorator } from '../field';
import { Callback, Context, createEventDecorator, createLambdaDecorator } from './lambda';
import {
  LambdaArgumentTypes,
  type LambdaMetadata,
  LambdaReflectKeys,
} from './lambda.types';

describe('Lambda Decorators', () => {
  describe('Default decorator', () => {
    enableBuildEnvVariable();
    const Lambda = createLambdaDecorator<Partial<LambdaMetadata>, LambdaMetadata>({
      getLambdaMetadata: (props, methodName) => ({
        ...props,
        name: methodName,
      }),
    });

    it('should create handlers', () => {
      class Test {
        @Lambda()
        test() {}
      }

      const handlers = getResourceHandlerMetadata(Test);
      expect(handlers).toHaveLength(1);
    });

    it('should create handlers with default metadata', () => {
      class Test {
        @Lambda()
        test() {}
      }

      const handlers = getResourceHandlerMetadata(Test);

      expect(handlers).toContainEqual({ name: 'test' });
    });

    it('should include lambda properties', () => {
      class Test {
        @Lambda({
          lambda: {
            memory: 1024,
            runtime: 22,
          },
        })
        test() {}
      }

      const handlers = getResourceHandlerMetadata(Test);

      expect(handlers).toContainEqual({
        lambda: { memory: 1024, runtime: 22 },
        name: 'test',
      });
    });
  });

  describe('Custom metadata properties', () => {
    enableBuildEnvVariable();

    interface TestMetadata extends Partial<LambdaMetadata> {
      foo: string;
      bar: number;
    }

    const Lambda = createLambdaDecorator<TestMetadata, TestMetadata>({
      getLambdaMetadata: (props, methodName) => ({
        ...props,
        name: methodName,
      }),
    });

    it('should exist foo and bar properties', () => {
      class Test {
        @Lambda({
          bar: 10,
          foo: '20',
        })
        test() {}
      }

      const handlers = getResourceHandlerMetadata(Test);

      expect(handlers).toContainEqual({ name: 'test', foo: '20', bar: 10 });
    });
  });

  describe('Lambda arguments', () => {
    enableBuildEnvVariable();
    const Lambda = createLambdaDecorator({
      getLambdaMetadata: (props) => props,
    });
    const Event = createEventDecorator({ prefix: 'test' });
    const FieldData = createFieldDecorator({ prefix: 'test', getMetadata: () => ({}) });

    class Field {
      @FieldData()
      foo: string;
    }

    class Test {
      @Lambda()
      test(
        @Callback() _callback: () => void,
        @Context() _context: any,
        @Event(Field) _e: Field
      ) {}
    }

    const eventParamsByMethod = Reflect.getMetadata(
      LambdaReflectKeys.arguments,
      Test.prototype
    );

    it('should add event argument', () => {
      expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.event);
    });

    it('should add callback argument', () => {
      expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.callback);
    });

    it('should add context argument', () => {
      expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.context);
    });

    it('should include arguments in order', () => {
      expect(eventParamsByMethod.test).toEqual([
        LambdaArgumentTypes.callback,
        LambdaArgumentTypes.context,
        LambdaArgumentTypes.event,
      ]);
    });
  });
});
