import { describe, expect, it } from 'vitest';
import {
  fn,
  getAccountId,
  getCallerArn,
  getDnsSuffix,
  getPartition,
  getRegion,
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
    fn: { upper: (value: string) => value.toUpperCase() } as any,
    token: { isUnresolved: () => false } as any,
  };

  it('accepts the first registration and resolves through the injected resolvers', () => {
    expect(() => registerRefResolvers(mockResolvers)).not.toThrow();

    expect(getResourceValue('bucket::test', 'id')).toBe('resolved-value');
    expect(getSSMValue('/example/path')).toBe('ssm-value');
    expect(getAccountId()).toBe('account-id');
    expect(getCallerArn()).toBe('caller-arn');
    expect(getRegion()).toBe('region');
    expect(getPartition()).toBe('partition');
    expect(getDnsSuffix()).toBe('dns-suffix');
    expect(fn.upper('hello')).toBe('HELLO');
    expect(token.isUnresolved('hello')).toBe(false);
  });

  it('throws on a second registration', () => {
    expect(() => registerRefResolvers(mockResolvers)).toThrow(
      'registerRefResolvers() must only be called once per process'
    );
  });
});
