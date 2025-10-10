import crypto from 'node:crypto';

export const createMd5Hash = (value: string) => {
  return crypto.createHash('md5').update(value).digest('hex');
};

export const createSha1 = (value: string) => {
  const shasum = crypto.createHash('sha1');
  shasum.update(value);

  return shasum.digest('hex');
};

export const uuid = () => {
  return crypto.randomUUID();
};
