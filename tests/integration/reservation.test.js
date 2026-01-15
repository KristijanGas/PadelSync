require('dotenv').config();
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
const editschedule = require('../../routes/editschedule.routes');
const reservationHandle = require('../../routes/reservationHandle.routes');

let bodyrequest = null;

function createAppWithOidcStub() {
  const app = express();
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');
  // Stub OIDC user + token
  app.use((req, res, next) => {
    const nickname = req.header('x-test-user') ?? 'default.user';

    req.oidc = {
      accessToken: {
        access_token: 'fake-token',
        token_type: 'Bearer',
        isExpired: () => false,
      },
      user: {
        nickname,
        email: `${nickname}@test.com`,
      },
      isAuthenticated: () => true,
    };
    req.body = bodyrequest;
    next();
  });

  app.use('/terrain', terrain);
  app.use('/editschedule', editschedule);
  app.use('/reservationHandle', reservationHandle);
  return app;
}


async function setupSubscription(app){
  axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });
  
  bodyrequest = { pretpNaziv: 'testpretplata123', pretpCijena: '10', levelPretplate: '0', poducavanje: 0 };
  const res = await request(app)
    .post('/editschedule/addSub')
    .set('x-test-user', 'gaspar.kristijan');
  expect(res.status).toBe(302);
  let SQLFindSubID = `SELECT tipPretpID FROM TIP_PRETPLATE WHERE pretpNaziv = ?`;
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const getOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  let row = await getOne(SQLFindSubID, ['testpretplata123']);
  expect(row).toBeDefined();
  expect(row.tipPretpID).toBeDefined();
  bodyrequest = null;
  db.close();
  return row.tipPretpID;
}

async function setupReservation(app, subscriptionId){
  bodyrequest = { day: 'tuesday', startTime: '16:00', endTime: '17:00', pretplateID: subscriptionId };
  axios.get.mockResolvedValue({ data: { emailVerified: true, nickname: 'gaspar.kristijan', email: 'gaspar.kristijan@gmail.com' } });

  const res = await request(app)
    .post('/editschedule/gaspar.kristijan/7/add')
    .set('x-test-user', 'gaspar.kristijan');

  expect(res.status).toBe(200);

  expect(res.text).toContain("Schedule added successfully!");
  bodyrequest = { day: 'tuesday', startTime: '18:00', endTime: '19:00', pretplateID: subscriptionId };

  const res2 = await request(app)
    .post('/editschedule/gaspar.kristijan/7/add')
    .set('x-test-user', 'gaspar.kristijan');

  expect(res2.status).toBe(200);

  expect(res2.text).toContain("Schedule added successfully!");
}

describe('Reservations setup', () => {

  it('allows a club to create a subscription with reservation times and displays it', async () => {
    
    const app = createAppWithOidcStub();
    let subscriptionId = await setupSubscription(app);
    expect(subscriptionId).toBeDefined();
    await setupReservation(app,subscriptionId);
    const res = await request(app)
      .get('/terrain/7')
      .set('x-test-user', 'some.otheruser');
    expect(res.status).toBe(200);
    expect(res.text).toContain("16:00 do 17:00");
    expect(res.text).toContain("18:00 do 19:00");
    expect(res.text).toContain("Pretplata testpretplata123, cijene 10€ tjedno.");
  });
  it('allows a player to make a reservation', async () => {
    
    const app = createAppWithOidcStub();
    let subscriptionId = await setupSubscription(app);
    expect(subscriptionId).toBeDefined();
    await setupReservation(app,subscriptionId);
    const res = await request(app)
  });
});
