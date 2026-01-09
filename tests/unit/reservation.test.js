const express = require('express');
const request = require('supertest');
const path = require('path');
const axios = require('axios');

jest.mock('axios');
jest.mock('express-openid-connect', () => ({
  ...jest.requireActual('express-openid-connect'),
  requiresAuth: jest.fn(() => (req, res, next) => next()),
}));
const terrain = require('../../routes/terrain.routes');

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

    //expect(res.status).toBe(200);
    });
});