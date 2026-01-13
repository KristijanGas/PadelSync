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
    
  it('adds a schedule at an available spot and rejects if its already filed', async () => {
    bodyrequest = { day: 'tuesday', startTime: '16:00', endTime: '17:00', pretplateID: 0 };
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();
    
    const res = await request(app)
      .post('/editschedule/gaspar.kristijan/8/add');

    expect(res.status).toBe(200);
    
    expect(res.text).toContain("Schedule added successfully!");
    const res2 = await request(app)
      .post('/editschedule/gaspar.kristijan/8/add');

    expect(res2.status).toBe(400);
    expect(res2.text).toContain("The specified time conflicts with an existing booking.");

  });
  it('adds a schedule with a subscription', async () => {
    bodyrequest = { day: 'tuesday', startTime: '16:00', endTime: '17:00', pretplateID: 12 };
    axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
    const app = createAppWithOidcStub();

    const res = await request(app)
      .post('/editschedule/gaspar.kristijan/8/add');

    expect(res.status).toBe(200);

    expect(res.text).toContain("Schedule added successfully!");


    let SQLQueryFindterminID = `SELECT * FROM TERMIN_TJEDNI WHERE vrijemePocetak = ? AND vrijemeKraj = ? AND terenID = ?`;
    const db = new sqlite3.Database("database.db");
    const getRows = (sql, params) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
    const terminData = await getRows(SQLQueryFindterminID, ["16:00", "17:01", "8"]);
    console.log("terminID:", terminData);
    let SQLQueryCheck =
        `SELECT * FROM PONAVLJAJUCA_REZ
    NATURAL JOIN TERMIN_TJEDNI
    NATURAL JOIN TIP_PRETPLATE
    WHERE PONAVLJAJUCA_REZ.tipPretpID = 12 AND
    TERMIN_TJEDNI.terminID = ?`;

    db.get(SQLQueryCheck, [terminID], (err, row) => {
      if (err) {
        console.error("Error checking for existing booking:", err);
        return;
      }
      expect(row).toBeDefined();
    });
    const res2 = await request(app)
      .post('/editschedule/gaspar.kristijan/8/add');
    expect(res2.status).toBe(400);
    expect(res2.text).toContain("The specified time conflicts with an existing booking.");
  });
});