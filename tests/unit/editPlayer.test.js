const express = require('express');
const request = require('supertest');
const playerRoutes = require('../../routes/edituser.routes');
const { requiresAuth } = require('express-openid-connect');

// MOCK verifyProfile i verifyDBProfile
jest.mock('../../backendutils/verifyProfile', () => ({
  verifyProfile: jest.fn(),
  verifyDBProfile: jest.fn(),
}));
const { verifyProfile, verifyDBProfile } = require('../../backendutils/verifyProfile');

// MOCK requiresAuth da prođe
jest.mock('express-openid-connect', () => ({
  requiresAuth: () => (req, res, next) => next(),
}));

describe('POST /edituser/:username/insertPlayerInfo', () => {

  function createApp(testUser) {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // stub OIDC user i accessToken
    app.use((req, res, next) => {
      req.oidc = {
        user: { nickname: testUser, email: `${testUser}@test.com` },
        accessToken: {
          token_type: 'Bearer',
          access_token: 'fake-token',
          expires_in: 3600,
          isExpired: () => false,
          refresh: async () => ({
            token_type: 'Bearer',
            access_token: 'new-fake-token',
            expires_in: 3600,
            isExpired: () => false,
            refresh: async () => {}
          })
        }
      };
      next();
    });

    // mock res.render da možemo testirati koji view rendera
    app.response.render = function(viewName) {
      this.send(`rendered:${viewName}`);
    };

    app.use('/edituser', playerRoutes);
    return app;
  }

  it('returns 400 if validation fails', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Player');

    const app = createApp('lp.kiss.2001');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({ imeIgrac: 'X', prezimeIgrac: 'Y' });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('returns 403 if user tries to edit another player', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Player');

    const app = createApp('someotheruser');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({ imeIgrac: 'Test', prezimeIgrac: 'Player', razZnanjaPadel: 'beginner' });

    expect(res.status).toBe(403);
    expect(res.text).toContain("You cannot insert this user's info");
  });

  it('returns 403 if Club tries to edit a player', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');

    const app = createApp('clubuser');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({ imeIgrac: 'Test', prezimeIgrac: 'Player', razZnanjaPadel: 'beginner' });

    expect(res.status).toBe(403);
    expect(res.text).toContain("You're not a player or admin. Why are you inserting player info?");
  });

  it('renders verifymail if verifyProfile returns false', async () => {
    verifyProfile.mockResolvedValue(false);
    verifyDBProfile.mockResolvedValue('Player');

    const app = createApp('lp.kiss.2001');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({ imeIgrac: 'Test', prezimeIgrac: 'Player', razZnanjaPadel: 'beginner' });

    expect(res.status).toBe(200); // render vraća 200
    expect(res.text).toContain('rendered:verifymail');
  });

  it('updates own player info successfully and redirects to /myprofile', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Player');

    const app = createApp('lp.kiss.2001');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({
        imeIgrac: 'Luka',
        prezimeIgrac: 'Kiss',
        razZnanjaPadel: 'intermediate',
        brojMob: '123456789',
        prefVrijeme: '18:00'
      });

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/myprofile');
  });

  it('allows admin to update another user and redirects to /', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Admin');

    const app = createApp('adminuser');

    const res = await request(app)
      .post('/edituser/lp.kiss.2001/insertPlayerInfo')
      .send({
        imeIgrac: 'AdminUpdated',
        prezimeIgrac: 'Player',
        razZnanjaPadel: 'pro'
      });

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/');
  });

});