import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { NestedStateMachine, RESOURCE_TYPE, State, StateMachine } from './state-machine';
import {
  type LambdaStateMetadata,
  type NestedStateMachineResourceMetadata,
  StateMachineReflectKeys,
  type StateMachineResourceMetadata,
} from './state-machine.types';

describe('State Machine Decorators', () => {
  beforeEach(() => {
    enableBuildEnvVariable();
  });
  describe('StateMachine', () => {
    it('Should create state machine metadata', () => {
      @StateMachine({
        startAt: 'startState',
        name: 'state-machine-test',
      })
      class Test {
        @State({
          end: true,
        })
        startState() {}
      }

      const metadata = getResourceMetadata<StateMachineResourceMetadata>(Test);

      expect(metadata).toBeDefined();
      expect(metadata.name).toEqual('state-machine-test');
      expect(metadata.foldername).toEqual(__dirname);
      expect(metadata.type).toEqual(RESOURCE_TYPE);
    });
  });

  describe('State', () => {
    it('Should create two handlers', () => {
      @StateMachine({
        startAt: 'startState',
        name: 'state-machine-test',
      })
      class Test {
        @State({
          next: 'endState',
        })
        startState() {}

        @State({
          end: true,
        })
        endState() {}
      }

      const handlersMetadata = getResourceHandlerMetadata<LambdaStateMetadata>(Test);

      expect(Array.isArray(handlersMetadata)).toBeTruthy();
      expect(handlersMetadata).toHaveLength(2);
      expect(handlersMetadata).toContainEqual({ name: 'startState', next: 'endState' });
      expect(handlersMetadata).toContainEqual({ name: 'endState', end: true });
    });
  });

  describe('NestedStateMachine', () => {
    it('Should create a nested state', () => {
      @NestedStateMachine({
        startAt: 'startState',
      })
      class Test {
        @State({
          end: true,
        })
        startState() {}
      }

      const metadata = getResourceMetadata<NestedStateMachineResourceMetadata>(Test);

      expect(metadata).toBeDefined();
      expect(metadata.name).toEqual('Test');
      expect(metadata.foldername).toEqual(__dirname);
      expect(metadata.type).toEqual(StateMachineReflectKeys.nested);
    });
  });
});
