import { describe, expect, it } from 'vitest';
import {
  fn,
  getAccountId,
  getResourceValue,
  getSSMValue,
  registerRefResolvers,
  token,
} from './reference.utils';

describe('reference.utils (no resolver registered)', () => {
  it('getResourceValue()/getSSMValue() return undefined without throwing', () => {
    expect(() => getResourceValue('bucket::test', 'id')).not.toThrow();
    expect(getResourceValue('bucket::test', 'id')).toBeUndefined();

    expect(() => getSSMValue('/example/path')).not.toThrow();
    expect(getSSMValue('/example/path')).toBeUndefined();
  });

  it('getAccountId() returns undefined without throwing', () => {
    expect(() => getAccountId()).not.toThrow();
    expect(getAccountId()).toBeUndefined();
  });

  it('fn/token method calls are safe no-ops without throwing', () => {
    expect(() => fn.upper('hello')).not.toThrow();
    expect(fn.upper('hello')).toBeUndefined();

    expect(() => token.isUnresolved('hello')).not.toThrow();
    expect(token.isUnresolved('hello')).toBeUndefined();
  });
});

// Must run after the block above: it registers a resolver for the rest of
// this module's lifetime, which would break the "no resolver registered"
// assumptions those tests rely on.
describe('registerRefResolvers', () => {
  const mockResolvers = {
    resolveResourceValue: () => 'resolved-value',
    resolveSsmValue: () => 'ssm-value',
    getAccountId: () => 'account-id',
    getCallerArn: () => 'caller-arn',
    getRegion: () => 'region',
    getPartition: () => 'partition',
    getDnsSuffix: () => 'dns-suffix',
    fn: {} as any,
    token: {} as any,
  };

  it('accepts the first registration', () => {
    expect(() => registerRefResolvers(mockResolvers)).not.toThrow();
    expect(getResourceValue('bucket::test', 'id')).toBe('resolved-value');
  });

  it('throws on a second registration', () => {
    expect(() => registerRefResolvers(mockResolvers)).toThrow(
      'registerRefResolvers() must only be called once per process'
    );
  });
});
