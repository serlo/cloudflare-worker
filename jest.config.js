/* eslint-disable @typescript-eslint/no-var-requires,import/no-commonjs */
module.exports = {
  preset: 'ts-jest',
  testPathIgnorePatterns: ['/node_modules/', '/__tests__\\/__utils__/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Fixes issue with memory leak in Jest see
  // https://github.com/jestjs/jest/issues/11956
  workerIdleMemoryLimit: '1GB',
}
