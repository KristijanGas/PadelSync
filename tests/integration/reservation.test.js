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
const myprofile = require('../../routes/myprofile.routes');

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
  app.use('/myprofile', myprofile);
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

  bodyrequest = { day: 'tuesday', startTime: '19:00', endTime: '20:12', pretplateID: 0 };

  const res3 = await request(app)
    .post('/editschedule/gaspar.kristijan/7/add')
    .set('x-test-user', 'gaspar.kristijan');

  expect(res3.status).toBe(200);
  expect(res3.text).toContain("Schedule added successfully!");

}
function currentDateOff(offset) {
  var date = new Date(Date.now());
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate()-date.getDay()+offset);
  let year = newDate.getFullYear().toString();
  let month = (newDate.getMonth()+1).toString();
  if(month.length == 1)
    month = "0" + month;
  let day = newDate.getDate().toString();
  if(day.length == 1)
    day = "0" + day;
  return year + '-' + month + '-' + day;
}

async function reserveJednokratna(app){
  let SQLFindNonsubscriptionRes = 
  `SELECT rezervacijaID FROM TERMIN_TJEDNI 
  NATURAL JOIN REZERVACIJA
  WHERE vrijemePocetak = ? AND vrijemeKraj = ? AND danTjedan = ?
  `;
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const getOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  let row = await getOne(SQLFindNonsubscriptionRes, ['19:00', '20:12', '2']);
  expect(row).toBeDefined();
  expect(row.rezervacijaID).toBeDefined();
  

  let date = currentDateOff(2+7);
  bodyrequest = {tipPlacanja: 'gotovina', termin: {datum: date, vrijemePocetak: '19:00', vrijemeKraj: '20:12', danTjedan: '2', teren: {terenID: 7}}};
  const res = await request(app).post('/terrain/7/'+row.rezervacijaID)
  .set('x-test-user', 'kristijan.gaspar')
  .send(bodyrequest);
  let SQLQueryCheck = 'SELECT * FROM JEDNOKRATNA_REZ WHERE rezervacijaID = ? AND username = ?';
  let rowCheck = await getOne(SQLQueryCheck, [row.rezervacijaID, 'kristijan.gaspar']);
  expect(rowCheck).toBeDefined();
  db.close();
  return row.rezervacijaID;
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
    expect(res.text).toContain("16:00 to 17:00");
    expect(res.text).toContain("18:00 to 19:00");
    expect(res.text).toContain("Subscription testpretplata123, costs 10€ per week.");
  });
  it('allows a player to make a single reservation and it shows up on my profile', async () => {
    
    const app = createAppWithOidcStub();
    let subscriptionId = await setupSubscription(app);
    expect(subscriptionId).toBeDefined();
    await setupReservation(app,subscriptionId);
    let rezervacijaID = await reserveJednokratna(app);
    const res = await request(app)
      .get('/myprofile')
      .set('x-test-user', 'gaspar.kristijan');
    expect(res.status).toBe(200);
    expect(res.text).toContain("20:12");
  });
  
});
