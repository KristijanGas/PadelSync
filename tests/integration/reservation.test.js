const express = require('express');
const request = require('supertest');
const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

jest.mock('axios');
jest.mock('express-openid-connect', () => ({
  ...jest.requireActual('express-openid-connect'),
  requiresAuth: jest.fn(() => (req, res, next) => next()),
}));
const terrain = require('../../routes/terrain.routes');

let bodyrequest = null;

function createAppWithOidcStub() {
  const app = express();
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');
  // Stub OIDC user + token
  app.use((req, res, next) => {
    req.oidc = {
      accessToken: { access_token: 'fake-token', token_type: 'Bearer', isExpired: () => false},
      user: {
        nickname: 'gaspar.kristijan',
        email: 'kristijan.gaspar@unizg.fer.hr'
      },
      isAuthenticated: () => true,
    };
    req.body = bodyrequest;
    next();
  });

  app.use('/terrain', terrain);
  return app;
}

describe('terrain GET route', () => {
    
    it('displays your terrain and shows reservations', async () => {
        axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
        const app = createAppWithOidcStub();

        const res = await request(app)
        .get('/terrain/7');

        expect(res.status).toBe(200);
    });
});

describe('terrain POST route', () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();
    it('allows you to make a reservation', async () => {


    const res = await request(app)
      .get('/terrain/7');

    expect(res.status).toBe(200);
    });
});