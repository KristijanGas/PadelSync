const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios')


// podstranica za pretraživanje klubova, igrača
const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

router.get('/:id', requiresAuth(), async (req, res) => {
  const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const id = req.params.id;
    let tereni;
    let termini;
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
    console.log(razinaPretplate);
    let terminiQuery = 'SELECT * FROM TERMIN_TJEDNI WHERE potrebnaPretplata <= ? AND terenID = ?'
    try {
        termini = await fetchAll(db, terminiQuery, [razinaPretplate, id]);
    } catch (err) {
        console.log(err);
    }

    res.render('terrain', {
            teren: tereni[0],
            termini: termini
        });
    db.close();
});


module.exports = router;