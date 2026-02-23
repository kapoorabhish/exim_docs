/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testRegex: '.*\\.spec\\.(ts|tsx)$',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        jsx: 'react-jsx',
      },
    }],
  },
  moduleNameMapper: {
    '^@exim/ui(.*)$': '<rootDir>/../../packages/ui/src$1',
    '^@exim/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
    // Next.js image/css/file stubs
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
  coverageThreshold: { global: { statements: 70 } },
};

module.exports = config;