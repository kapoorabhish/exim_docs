import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        strictPropertyInitialization: false,
        module: 'commonjs',
        target: 'ES2022',
      },
    }],
  },
  collectCoverageFrom: ['modules/**/*.service.ts'],
  coverageDirectory: '../coverage',
  coverageReporters: ['json-summary', 'text'],
  coverageThreshold: {
    global: { statements: 70 },
  },
  testEnvironment: 'node',
};

export default config;
