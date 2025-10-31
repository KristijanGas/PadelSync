
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  // Run per-test setup to copy the DB before each test and remove it after.
  setupFilesAfterEnv: ['<rootDir>/tests/setup/perTestDb.js'],
};