const axios = require('axios');
jest.mock('axios');
const { verifyDBProfile } = require('../../../backendutils/verifyProfile');
const sqlite3 = require('sqlite3').verbose();

describe('verifyDBProfile', () => {
  it('returns correct user types', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });
    const fakeReq = { oidc: { accessToken: { token_type: 'Bearer', access_token: 'fake', email: 'alice@example.com' } } };
    let res = {};

    // open the test DB (per-test setup sets process.env.DB_PATH)
    const dbPath = process.env.DB_PATH || 'database.db';
    const db = new sqlite3.Database(dbPath);

    const run = (sql, params=[]) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

    const result = await verifyDBProfile('alice', 'alice@example.com', res);
    expect(result).toBe('UserDidntChoose');

    // add user to igrac for further testing
    await run('INSERT INTO igrac (username, imeIgrac) VALUES (?, ?)', ['alice', 'alicecumchalice']);
    const result2 = await verifyDBProfile('alice', 'alicecumchalice', res);
    expect(result2).toBe('Player');
    await run('DELETE FROM igrac WHERE username = ?', ['alice']);

    // add user to klub for further testing
    await run('INSERT INTO klub (username, imeKlub) VALUES (?, ?)', ['alice', 'alicecumchalice']);
    const result3 = await verifyDBProfile('alice', 'alicecumchalice', res);
    expect(result3).toBe('Club');

    await run('DELETE FROM klub WHERE username = ?', ['alice']);

    // add user to admin for further testing
    await run('INSERT INTO admin (username, imeAdmin, prezimeAdmin) VALUES (?, ?, ?)', ['alice', 'alicecumchalice', 'alicecumchalice']);
    const result4 = await verifyDBProfile('alice', 'alicecumchalice', res);
    expect(result4).toBe('Admin');

    await run('DELETE FROM admin WHERE username = ?', ['alice']);
    
    // add user to both klub and igrac to simulate corrupted DB
    await run('INSERT INTO klub (username, imeKlub) VALUES (?, ?)', ['alice', 'alicecumchalice']);
    await run('INSERT INTO igrac (username, imeIgrac) VALUES (?, ?)', ['alice', 'alicecumchalice']);
    const result5 = await verifyDBProfile('alice', 'alicecumchalice', res);
    expect(result5).toBe('CorruptedDB');

    await run('DELETE FROM klub WHERE username = ?', ['alice']);
    await run('DELETE FROM igrac WHERE username = ?', ['alice']);
    // cleanup user
    try {
      await run('DELETE FROM korisnik WHERE username = ?', ['alice']);
    } catch (err) {
      // log but don't fail test on cleanup
      console.error('Error deleting test user:', err && err.message ? err.message : err);
    }
    db.close();
  });
});
