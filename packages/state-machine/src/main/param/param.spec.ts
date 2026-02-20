import 'reflect-metadata';
import {
  enableBuildEnvVariable,
  getMetadataByKey,
  getMetadataPrototypeByKey,
  type PayloadMetadata,
} from '@lafken/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { Param, Payload, stateMachineFieldKey, stateMachinePayloadKey } from './param';
import type { StateMachineParamMetadata } from './param.types';

describe('Decorators', () => {
  beforeEach(() => {
    enableBuildEnvVariable();
  });

  it('Should create payload data', () => {
    @Payload()
    class TestPayload {}

    const metadata = getMetadataByKey<PayloadMetadata>(
      TestPayload,
      stateMachinePayloadKey
    );

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('TestPayload');
  });

  it('Should create params', () => {
    @Payload()
    class TestPayload {
      @Param({
        context: 'jsonata',
        value: '{% $state.input.name %}',
      })
      name: string;

      @Param({
        context: 'execution',
        source: 'id',
      })
      executionId: string;
    }

    const metadata = getMetadataPrototypeByKey<StateMachineParamMetadata[]>(
      TestPayload,
      stateMachineFieldKey
    );

    expect(metadata).toBeDefined();
    expect(metadata).toContainEqual({
      context: 'jsonata',
      value: '{% $state.input.name %}',
      type: 'String',
      initialValue: undefined,
      destinationName: 'name',
      name: 'name',
    });

    expect(metadata).toContainEqual({
      context: 'execution',
      source: 'id',
      type: 'String',
      initialValue: undefined,
      destinationName: 'executionId',
      name: 'executionId',
    });
  });

  it('Should create nested Params', () => {
    @Payload()
    class NestedTest {
      @Param({
        context: 'input',
        source: 'city',
      })
      city: string;
    }

    @Payload()
    class TestPayload {
      @Param({
        context: 'custom',
        type: NestedTest,
      })
      address: NestedTest;
    }

    const metadata = getMetadataPrototypeByKey<StateMachineParamMetadata[]>(
      TestPayload,
      stateMachineFieldKey
    );

    expect(metadata).toBeDefined();
    expect(metadata).toContainEqual({
      context: 'custom',
      destinationName: 'address',
      name: 'address',
      payload: { id: 'NestedTest', name: 'NestedTest' },
      properties: [
        {
          context: 'input',
          destinationName: 'city',
          initialValue: undefined,
          name: 'city',
          source: 'city',
          type: 'String',
        },
      ],
      type: 'Object',
    });
  });
});
