const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios');
const { checkAvailability } = require('../backendutils/checkAvailability');
const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');

// podstranica za pretraživanje klubova, igrača
const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  })

//offset je int koju koristim da predam dayofweek, dakle da mogu normalizirati koji je datum
//da bi lakse provjerio dostupnost termina
//za obicnu currentDate
function currentDateOff(offset) {
  var date = new Date(Date.now());
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate()-date.getDay()+offset);
  const year = newDate.getFullYear();
  const month = newDate.getMonth()+1;
  const day = newDate.getDate();
  return year + '-' + month + '-' + day;
}
function currentDate() {
  var date = new Date(Date.now());
  const year = date.getFullYear();
  const month = date.getMonth()+1;
  const day = date.getDate();
  return year + '-' + month + '-' + day;
}
router.get('/:id', requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const id = req.params.id;
  let tereni;
  let termini;
  let termini2;
  let razinaPretplate;
  let pretplataQuery = 'select * from pretplata join tip_pretplate on pretplata.tipPretpID = tip_pretplate.tipPretpID WHERE TIP_PRETPLATE.username = ? and PRETPLATA.username = ? and PRETPLATA.pretpAktivna = 1';
  let clubUsername;
  let tereniQuery = 'SELECT * FROM teren WHERE terenID = ?';
  let cardAllowed;
  try {
      tereni = await fetchAll(db, tereniQuery, [id]);
  } catch (error) {
      console.error(error);
  }
  const isVerified = await verifyProfile(req, res);
  if (isVerified) {
    clubUsername = tereni[0].username;
    let playerUsername = req.oidc.user.nickname;

    try {
      let temp = await fetchAll(db, pretplataQuery, [clubUsername, playerUsername]);
      if (temp[0] != null)
        razinaPretplate = temp[0].levelPretplate;
      else
        razinaPretplate = 0;
    } catch (error) {
      console.error(error);
    }
  } else {
    razinaPretplate = 0;
  }
  //termini koje cu prikazat za trenutni tjedan
  let terminiQuery = `SELECT * FROM TERMIN_TJEDNI WHERE potrebnaPretplata <= ? AND terenID = ?
                      AND danTjedan >= (select strftime('%w', date('now')))`;
  //i za 3 naredna tjedna
  let terminiQuery2 = `SELECT * FROM TERMIN_TJEDNI WHERE potrebnaPretplata <= ? AND terenID = ?`;
  try {
      termini = await fetchAll(db, terminiQuery, [razinaPretplate, id]);
      termini2 = await fetchAll(db, terminiQuery2, [razinaPretplate, id]);
  } catch (err) {
      console.error(err);
  }

  //provjera dostupnosti
  let dostupniTermini = [];
  for (let termin of termini) {
    let dejtOwO = currentDateOff(termin.danTjedan);
    if(checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj)) {
      const kopija = structuredClone(termin);
      kopija.datum = dejtOwO;
      kopija.klub = clubUsername;
      dostupniTermini.push(kopija);
    }
  }
  for(let i = 1; i < 4; i++) {
    for(let termin of termini2) {
      let dejtOwO = currentDateOff(termin.danTjedan+i*7);
      //console.log("dejt je " + dejtOwO, "teren je " + termin.terenID);
      //console.log("pocetak = " + termin.vrijemePocetak + " kraj = " + termin.vrijemeKraj);
      if(await checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj)) {
        const kopija = structuredClone(termin);
        kopija.datum = dejtOwO;
        kopija.klub = clubUsername;
        dostupniTermini.push(kopija);
      } else {
        
      }
    }
  }

  let row = await dbGet(db, "SELECT stripeId FROM klub WHERE username = ?", [clubUsername]);
  let stripeId = row?.stripeId;

  if (!stripeId) {
    cardAllowed = false;
  }else{
    cardAllowed = true;
  }

  res.render('terrain', {
          teren: tereni[0],
          termini: dostupniTermini,
          cardAllowed
      });
  db.close();
});



router.post('/:id', requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
  const { tipTermina, tipPlacanja, termin, teren} = req.body;
  const terminID = req.params.id;
  console.log(terminID)
  const datum = termin.datum;
  const username = req.oidc.user.nickname;
  let statusPlac;
  let tipPretpId;
  let ID;

  let statusRez;
  if(tipPlacanja==="gotovina"){
    statusRez = StatusRezervacije.AKTIVNA
    statusPlac = StatusPlacanja.POTVRDJENO
  }else{
    statusRez = StatusRezervacije.PENDING
    statusPlac = StatusPlacanja.PENDING
  }

  const SQLQuery1 = `INSERT INTO REZERVACIJA (statusRez, terminID) VALUES (?, ?) RETURNING *`
  await new Promise((resolve, reject) => {
    db.get(SQLQuery1, [statusRez, terminID], function(err, row) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve();
      ID = row.rezervacijaID;
    });
  });
  
  

  const currentDateUTC = new Date().toISOString().split('T')[0];
  const cijena = teren.cijenaTeren;

  
  let pretpID = 1 ///sta je ovo u pm
  const SQLTransaction = `INSERT INTO TRANSAKCIJA(iznos, statusPlac, nacinPlacanja, datumPlacanja, pretpID, stripePaymentId)
                          VALUES (?, ?, ?, ?, ?, ?)`
  const transakcijaID = await new Promise((resolve, reject) => {
  db.run(SQLTransaction, [cijena, statusPlac, tipPlacanja, currentDateUTC, pretpID], function(err) {
    if (err) {
      console.error(err.message);
      return reject(err);
    }
    resolve(this.lastID);
      });
    });

  if(tipTermina == 'jednokratni') {
    const SQLQuery2 = `INSERT INTO JEDNOKRATNA_REZ (datumRez, rezervacijaID, username, transakcijaID) VALUES (?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
    db.run(SQLQuery2, [datum, ID, username, transakcijaID], function(err) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve();
    });
  });
  }else if(tipTermina == 'ponavljajuci') {
    let pretplataQry = `select TIP_PRETPLATE.tipPretpID from pretplata join tip_pretplate on pretplata.tipPretpID = tip_pretplate.tipPretpID
    WHERE TIP_PRETPLATE.username = ? and PRETPLATA.username = ? and PRETPLATA.pretpAktivna = 1`;
    const clubUsername = termin.clubUsername;
    let rows;
    try {
      rows = await fetchAll(db, pretplataQry, [clubUsername, username]);
    } catch (error) {
      console.error(error);
    }
    if(rows != undefined) {
      tipPretpId = rows[0].tipPretpID;
    } else {
      res.status(404).send("Ne postoji covjek s tom pretplatom LoL");
    }
    const SQLQuery3 = `INSERT INTO PONAVLJAJUCA_REZ (rezervacijaID, tipPretpID) VALUES (?, ?)`
    db.run(SQLQuery3, [ID, tipPretpId], function(err) {
      if (err) {
        console.error(err.message);
        return reject(err);
      }
      resolve();
    });
  } else {
    res.status(500).send("Zasto saljes post zahtjev s nevaljajucim parametrom?")
  }
  
  const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  if(tipPlacanja==="gotovina"){
    res.json({redirect : currentUrl})
  }else{
    const url = req.protocol + "://" + req.headers.host
    res.json({checkoutUrl : `${url}/stripe/payment`, transakcijaID})
  }
});



module.exports = router;