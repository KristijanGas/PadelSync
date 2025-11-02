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
        email: 'gaspar.kristijan@gmail.com'
      },
      isAuthenticated: () => true,
    };
    req.body = bodyrequest;
    next();
  });

  app.use('/editschedule', editschedule);
  return app;
}

describe('editschedule GET route', () => {
    
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


describe('editschedule POST route', () => {
    
  it('adds a schedule at an available spot', async () => {
    bodyrequest = { day: 'tuesday', startTime: '16:00', endTime: '17:00' };
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();
    
    //const res = await request(app)
    //  .post('/editschedule/gaspar.kristijan/8/add');

    //expect(res.status).toBe(200);
    
    //expect(res.text).toContain("Schedule added successfully!");

  });
  bodyrequest = undefined;
});