import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@lafken/(.*)$': '<rootDir>/../$1/src',
  },
};

export default config;
