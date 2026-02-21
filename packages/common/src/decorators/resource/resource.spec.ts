import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';

import { enableBuildEnvVariable, getResourceMetadata } from '../../utils';
import { createResourceDecorator } from './resource';

describe('Resource decorator', () => {
  enableBuildEnvVariable();
  const Resource = createResourceDecorator({
    type: 'Test',
  });

  @Resource({
    name: 'test-resource',
  })
  class TestResource {}

  const metadata = getResourceMetadata(TestResource);

  it('should exist resource metadata', () => {
    expect(metadata).toBeDefined();
  });

  it('should exist resource metadata properties', () => {
    expect(metadata.name).toBe('test-resource');
    expect(metadata.type).toBe('Test');
    expect(metadata.foldername).toBe(__dirname);
    expect(metadata.filename).toBe(basename(__filename));
    expect(metadata.originalName).toBe('TestResource');
  });
});
