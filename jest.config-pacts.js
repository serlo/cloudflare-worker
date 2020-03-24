module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '/__tests-pacts__/.*\\.[jt]sx?$',
  watchPathIgnorePatterns: ['<rootDir>/pacts/']
}
