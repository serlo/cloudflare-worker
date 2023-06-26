import type { Config } from '@jest/types'

const jestConfig: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  testPathIgnorePatterns: ['/node_modules/', '/__tests__\\/__utils__/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Fixes issue with memory leak in Jest see
  // https://github.com/jestjs/jest/issues/11956
  workerIdleMemoryLimit: '1GB',
}

// eslint-disable-next-line import/no-default-export
export default jestConfig
