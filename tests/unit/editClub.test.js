// tests/unit/editClub.test.js
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ===== MOCKS =====
jest.mock('../../backendutils/verifyProfile', () => ({
  verifyProfile: jest.fn(),
  verifyDBProfile: jest.fn()
}));
const { verifyProfile, verifyDBProfile } = require('../../backendutils/verifyProfile');

jest.mock('express-openid-connect', () => ({
  requiresAuth: () => (req, res, next) => next(),
}));

jest.mock('../../backendutils/mapbox', () => ({
  fetchAddresses: jest.fn()
}));
const { fetchAddresses } = require('../../backendutils/mapbox');

// ===== Dummy multer =====
const upload = {
  array: () => (req, res, next) => {
    if (req._testFiles) {
      req.files = req._testFiles.map(f => ({
        originalname: f.name,
        buffer: f.buffer,
        mimetype: f.mimetype || 'image/jpeg',
      }));
    }
    next();
  }
};

// ===== Load test images =====
function loadTestImages(filenames) {
  return filenames.map(name => ({
    name,
    buffer: fs.readFileSync(path.join(__dirname, '../../public/images', name)),
    mimetype: name.endsWith('.avif') ? 'image/avif' : 'image/jpeg'
  }));
}

// ===== Process images middleware =====
const processImages = require('../../middlewares/imageprocessor'); // tvoj middleware

// ===== Mock DB run =====
const runMock = jest.fn((sql, params, cb) => cb(null));
sqlite3.Database.prototype.run = runMock;

// ===== Helper createApp =====
function createApp(username, testFiles = []) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // stub OIDC user i accessToken
  app.use((req, res, next) => {
    req.oidc = {
      user: { nickname: username, email: `${username}@test.com` },
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
    req._testFiles = testFiles;
    next();
  });

  // mock res.render
  app.response.render = function(viewName) {
    this.send(`rendered:${viewName}`);
  };

  // ruta
  const playerRoutes = require('../../routes/edituser.routes');
  app.use('/edituser', playerRoutes);
  return app;
}

// ===== TESTS =====
describe('POST /edituser/:username/insertClubInfo', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if validation fails', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [] });

    const app = createApp('myclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({
        imeKlub: 'X',
        klubRadiDo: '25:00',
        adresaKlub: 'Invalid'
      });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('renders verifymail if verifyProfile fails', async () => {
    verifyProfile.mockResolvedValue(false);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('myclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({ imeKlub: 'Valid Club', adresaKlub: 'valid address' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('rendered:verifymail');
  });

  it('returns 403 if user is not a club or admin', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Player');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('myclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({ imeKlub: 'Valid Club', adresaKlub: 'valid address' });

    expect(res.status).toBe(403);
    expect(res.text).toContain("You're not a club or admin");
  });

  it('returns 403 if non-admin tries to edit another club', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('otherclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({ imeKlub: 'Valid Club', adresaKlub: 'valid address' });

    expect(res.status).toBe(403);
    expect(res.text).toContain("You cannot insert this user's info");
  });

  it('updates own club successfully and returns redirectURL /myprofile', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('myclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({
        imeKlub: 'Valid Club',
        adresaKlub: 'valid address',
        svlacionice: 5
      });

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/myprofile');
  });

  it('admin edits another club successfully and returns redirectURL /', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Admin');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('adminuser');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .send({
        imeKlub: 'Admin Updated Club',
        adresaKlub: 'valid address'
      });

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/');
  });

  it('adds real photos successfully and returns redirectURL /myprofile', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const testFiles = loadTestImages(['padel1.avif', 'padel2.jpg']);
    const app = createApp('myclub', testFiles);

    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .field('imeKlub', 'Valid Club')
      .field('adresaKlub', 'valid address');

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/myprofile');
    expect(runMock).toHaveBeenCalled();
  });
  it('removes photos successfully', async () => {
    verifyProfile.mockResolvedValue(true);
    verifyDBProfile.mockResolvedValue('Club');
    fetchAddresses.mockResolvedValue({ features: [{ place_name: 'valid address' }] });

    const app = createApp('myclub');
    const res = await request(app)
      .post('/edituser/myclub/insertClubInfo')
      .field('imeKlub', 'Valid Club')
      .field('adresaKlub', 'valid address')
      .field('erasePhotos[]', '123')
      .field('erasePhotos[]', '456');

    expect(res.status).toBe(200);
    expect(res.body.redirectURL).toBe('/myprofile');
    expect(runMock).toHaveBeenCalled();
  });

});
