import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};

export default config;
