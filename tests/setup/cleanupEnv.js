const fs = require('fs');

// Jest runs this file in the test environment; register an afterAll hook to
// remove the temporary DB copy once all tests in the suite have finished.
afterAll(() => {
  try {
    if (global.__TEST_DB_PATH__ && fs.existsSync(global.__TEST_DB_PATH__)) {
      fs.unlinkSync(global.__TEST_DB_PATH__);
      // console.log('Removed test DB', global.__TEST_DB_PATH__);
    }
  } catch (e) {
    // ignore cleanup errors
  }
});
