import crypto from 'node:crypto';

/**
 * Creates a SHA-256 checksum of the given value.
 *
 * Intended for deterministic content hashing (e.g. unique directory names,
 * deployment triggers, resource versions). SHA-256 is intentionally fast, so
 * it must NOT be used to hash passwords or other secrets
 */
export const createSha256 = (value: string) => {
  const shasum = crypto.createHash('sha256');
  shasum.update(value);

  return shasum.digest('hex');
};

export const uuid = () => {
  return crypto.randomUUID();
};
