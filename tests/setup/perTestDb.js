const fs = require('fs');
const path = require('path');
const os = require('os');

const realDb = path.resolve(__dirname, '../../database.db');

function makeTempDbPath() {
  return path.join(os.tmpdir(), `padelsync-test-db-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
}

beforeEach(() => {
  // Create a fresh temp copy of the real DB for every test
  try {
    const tmpDb = makeTempDbPath();
    fs.copyFileSync(realDb, tmpDb);
    try { fs.chmodSync(tmpDb, 0o666); } catch (e) { /* ignore */ }
    process.env.DB_PATH = tmpDb;
    // store current test DB path so afterEach can remove it
    if (!global.__TEST_DB_PATHS__) global.__TEST_DB_PATHS__ = [];
    global.__TEST_DB_PATHS__.push(tmpDb);
  } catch (err) {
    // If the copy fails, log and continue (tests will likely fail if DB missing)
    // but we don't want the setup to crash silently.
    console.error('perTestDb beforeEach error:', err && err.message ? err.message : err);
  }
});

afterEach(() => {
  // Remove the last temp DB created for this test
  try {
    const tmpDb = global.__TEST_DB_PATHS__ && global.__TEST_DB_PATHS__.pop();
    if (tmpDb && fs.existsSync(tmpDb)) {
      try { fs.unlinkSync(tmpDb); } catch (e) { /* ignore unlink errors */ }
    }
  } catch (err) {
    console.error('perTestDb afterEach error:', err && err.message ? err.message : err);
  }
});
