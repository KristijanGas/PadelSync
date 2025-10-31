const express = require('express');
const request = require('supertest');
const path = require('path');

const user_search = require('../../routes/user_search.routes');

function createAppWithOidcStub() {
  const app = express();
  // make sure EJS views can render in tests
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');

  // stub session and oidc for routes that call req.oidc
  app.use((req, res, next) => {
    req.session = {};
    req.oidc = {
      isAuthenticated: () => false,
      user: {}
    };
    next();
  });

  app.use('/user_search', user_search);
  return app;
}

describe('GET /user_search', () => {
  it('returns 200 and renders user_search for igrac', async () => {
    const app = createAppWithOidcStub();
    const resplysearch = await request(app).get('/user_search/igrac/padel');
    expect(resplysearch.text).toContain('padelmaster3000');
    expect(resplysearch.text).toContain('padelina');
    expect(resplysearch.status).toBe(200);
    // Optionally assert body contains some expected string from your view
    expect(resplysearch.text).toContain('<!DOCTYPE html>'); // basic check: HTML returned
  });
  it('returns 200 and renders user_search for klub', async () => {
    const app = createAppWithOidcStub();
    const resplysearch = await request(app).get('/user_search/klub/padel');
    expect(resplysearch.text).toContain('PadelGrom');
    expect(resplysearch.status).toBe(200);
    // Optionally assert body contains some expected string from your view
    expect(resplysearch.text).toContain('<!DOCTYPE html>'); // basic check: HTML returned
  });
});