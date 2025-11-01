const express = require('express');
const request = require('supertest');
const path = require('path');
const axios = require('axios');

jest.mock('axios');
jest.mock('express-openid-connect', () => ({
  ...jest.requireActual('express-openid-connect'),
  requiresAuth: jest.fn(() => (req, res, next) => next()),
}));

const editschedule = require('../../routes/editschedule.routes');

function createAppWithOidcStub() {
  const app = express();
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');

  // Stub OIDC user + token
  app.use((req, res, next) => {
    req.oidc = {
      accessToken: {
        token_type: 'Bearer',
        access_token: 'fake-token',
        isExpired: () => true
      },
      user: {
        nickname: 'gaspar.kristijan',
        email: 'gaspar.kristijan@gmail.com'
      },
      isAuthenticated: () => true,
    };
    next();
  });

  app.use('/editschedule', editschedule);
  return app;
}

describe('editschedule route', () => {
    
  it('displays your terrain', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();

    const res = await request(app)
      .get('/editschedule/gaspar.kristijan/8');

    expect(res.status).toBe(200);
  });
  it('forbids displaying terrain that isnt yours', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();

    const res = await request(app)
      .get('/editschedule/gaspar.kristijan/1');

    expect(res.status).toBe(403);
  });
  
  it('forbids displaying a terrain with wrong login', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();

    const res = await request(app)
      .get('/editschedule/andjela.replit/8');
    expect(res.status).toBe(403);
  });
});