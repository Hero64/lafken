import { describe, expect, it } from 'vitest';
import { Refs, registerRefResolvers } from './reference.utils';

describe('Refs (no resolver registered)', () => {
  it('resourceValue()/ssmValue() return undefined without throwing', () => {
    expect(() => Refs.resourceValue('bucket::test', 'id')).not.toThrow();
    expect(Refs.resourceValue('bucket::test', 'id')).toBeUndefined();

    expect(() => Refs.ssmValue('/example/path')).not.toThrow();
    expect(Refs.ssmValue('/example/path')).toBeUndefined();
  });

  it('accountId() returns undefined without throwing', () => {
    expect(() => Refs.accountId()).not.toThrow();
    expect(Refs.accountId()).toBeUndefined();
  });

  it('fn/token method calls are safe no-ops without throwing', () => {
    expect(() => Refs.fn.upper('hello')).not.toThrow();
    expect(Refs.fn.upper('hello')).toBeUndefined();

    expect(() => Refs.token.isUnresolved('hello')).not.toThrow();
    expect(Refs.token.isUnresolved('hello')).toBeUndefined();
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

    expect(Refs.resourceValue('bucket::test', 'id')).toBe('resolved-value');
    expect(Refs.ssmValue('/example/path')).toBe('ssm-value');
    expect(Refs.accountId()).toBe('account-id');
    expect(Refs.callerArn()).toBe('caller-arn');
    expect(Refs.region()).toBe('region');
    expect(Refs.partition()).toBe('partition');
    expect(Refs.dnsSuffix()).toBe('dns-suffix');
    expect(Refs.fn.upper('hello')).toBe('HELLO');
    expect(Refs.token.isUnresolved('hello')).toBe(false);
  });

  it('throws on a second registration', () => {
    expect(() => registerRefResolvers(mockResolvers)).toThrow(
      'registerRefResolvers() must only be called once per process'
    );
  });
});
