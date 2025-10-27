const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router()

// podstranica za pretraživanje klubova, igrača
const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

router.get('/:id', async (req, res) => {
    const db = new sqlite3.Database("database.db");
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

    let clubUsername = tereni[0].username;
    let playerUsername = req.oidc.user.nickname;

    try {
      let temp = await fetchAll(db, pretplataQuery, [clubUsername, playerUsername]);
      razinaPretplate = temp[0].levelPretplate;
    } catch (error) {
      console.log(error);
    }

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