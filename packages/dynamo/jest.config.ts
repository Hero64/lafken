import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  preset: 'jest-dynalite',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@lafken/(.*)$': '<rootDir>/../$1/src',
  },
};

export default config;
