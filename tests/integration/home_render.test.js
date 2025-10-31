const express = require('express');
const request = require('supertest');
const path = require('path');

const homeRouter = require('../../routes/home.routes');

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

  app.use('/home', homeRouter);
  return app;
}

describe('GET /home', () => {
  it('returns 200 and renders home', async () => {
    const app = createAppWithOidcStub();
    const res = await request(app).get('/home/');
    expect(res.status).toBe(200);
    // Optionally assert body contains some expected string from your view
    expect(res.text).toContain('<'); // basic check: HTML returned
  });
});