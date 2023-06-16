/* eslint-disable @typescript-eslint/no-var-requires,import/no-commonjs */
module.exports = {
  preset: 'ts-jest',
  testPathIgnorePatterns: ['/node_modules/', '/__tests__\\/__utils__/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}
