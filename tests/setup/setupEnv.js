const fs = require('fs');
const path = require('path');
const os = require('os');

// Create a timestamped temp DB path and copy the real DB there. This ensures tests
// can freely write without modifying the developer DB.
const realDb = path.resolve(__dirname, '../../database.db');
const tmpDb = path.join(os.tmpdir(), `padelsync-test-db-${Date.now()}.sqlite`);

try {
  fs.copyFileSync(realDb, tmpDb);
  try { fs.chmodSync(tmpDb, 0o666); } catch (e) { /* ignore chmod errors */ }
  // Make the test process use the copied DB
  process.env.DB_PATH = tmpDb;
  // expose for cleanup
  global.__TEST_DB_PATH__ = tmpDb;
  // ensure cleanup on unexpected exits too
  process.on('exit', () => {
    try { if (global.__TEST_DB_PATH__ && fs.existsSync(global.__TEST_DB_PATH__)) fs.unlinkSync(global.__TEST_DB_PATH__); } catch (e) {}
  });
} catch (err) {
  // If copy fails, tests should still run but may modify real DB; better to fail fast
  console.error('Could not create test DB copy:', err.message);
}
