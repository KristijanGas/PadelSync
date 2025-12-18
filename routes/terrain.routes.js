const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios');
const { checkAvailability } = require('../backendutils/checkAvailability');


// podstranica za pretraživanje klubova, igrača
const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

//offset je int koju koristim da predam dayofweek, dakle da mogu normalizirati koji je datum
//da bi lakse provjerio dostupnost termina
//za obicnu currentDate
function currentDateOff(offset) {
  var date = new Date(Date.now());
  const year = date.getFullYear();
  const month = date.getMonth()+1;
  const day = date.getDate()-date.getDay()+offset;
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

    let tereniQuery = 'SELECT * FROM teren WHERE terenID = ?';
    try {
        tereni = await fetchAll(db, tereniQuery, [id]);
    } catch (error) {
        console.log(error);
    }
    const isVerified = await verifyProfile(req);
    if (isVerified) {
      let clubUsername = tereni[0].username;
      let playerUsername = req.oidc.user.nickname;

      try {
        let temp = await fetchAll(db, pretplataQuery, [clubUsername, playerUsername]);
        if (temp[0] != null)
          razinaPretplate = temp[0].levelPretplate;
        else
          razinaPretplate = 0;
      } catch (error) {
        console.log(error);
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
        console.log(err);
    }

    //provjera dostupnosti
    let dostupniTermini = [];
    for (let termin of termini) {
      let dejtOwO = currentDateOff(termin.danTjedan);
      if(checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj))
        dostupniTermini.push(termin);
    }
    for(let i = 1; i < 4; i++) {
      for(let termin of termini2) {
        let dejtOwO = currentDateOff(termin.danTjedan+i*7);
        if(checkAvailability(termin.terenID, dejtOwO, termin.vrijemePocetak, termin.vrijemeKraj))
          dostupniTermini.push(termin);
      }
    }
    //NEMAM POJMA JEL RADI
    res.render('terrain', {
            teren: tereni[0],
            termini: dostupniTermini
        });
    db.close();
});


module.exports = router;