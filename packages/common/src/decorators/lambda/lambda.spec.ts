import { enableBuildEnvVariable, getResourceHandlerMetadata } from '../../utils';
import { createLambdaDecorator } from './lambda';
import type { LambdaMetadata } from './lambda.types';

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

  // describe('Lambda arguments', () => {
  //   enableBuildEnvVariable();
  //   const Lambda = createLambdaDecorator({
  //     getLambdaMetadata: (props) => props,
  //   });
  //   const Event = createEventDecorator(() => {
  //     return {
  //       fields: 'Test',
  //     };
  //   });

  //   class Field {}

  //   class Test {
  //     @Lambda()
  //     test(
  //       @Callback() _callback: () => void,
  //       @Context() _context: any,
  //       @Event(Field) _e: Field
  //     ) {}
  //   }

  //   const eventParamsByMethod = Reflect.getMetadata(
  //     LambdaReflectKeys.ARGUMENTS,
  //     Test.prototype
  //   );

  //   it('should add event argument', () => {
  //     expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.EVENT);
  //   });

  //   it('should add callback argument', () => {
  //     expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.CALLBACK);
  //   });

  //   it('should add context argument', () => {
  //     expect(eventParamsByMethod.test).toContainEqual(LambdaArgumentTypes.CONTEXT);
  //   });

  //   it('should include arguments in order', () => {
  //     expect(eventParamsByMethod.test).toEqual([
  //       LambdaArgumentTypes.CALLBACK,
  //       LambdaArgumentTypes.CONTEXT,
  //       LambdaArgumentTypes.EVENT,
  //     ]);
  //   });
  // });
});
