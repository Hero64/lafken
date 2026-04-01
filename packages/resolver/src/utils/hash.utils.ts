import crypto from 'node:crypto';

export const createSha256 = (value: string) => {
  const shasum = crypto.createHash('sha256');
  shasum.update(value);

  return shasum.digest('hex');
};

export const uuid = () => {
  return crypto.randomUUID();
};
