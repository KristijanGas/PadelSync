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

    let razinaPretplate = 1;
    //mrm dodat ovo, kancer
    let pretplataQuery = 'SELECT * from PRETPLATA NATURAL JOIN TIP_PRETPLATE WHERE TIP_PRETPLATE.username = '

    let terminiQuery = 'SELECT * FROM TERMIN_TJEDNI WHERE potrebnaPretplata <= ? AND terenID = ?'
    try {
        termini = await fetchAll(db, terminiQuery, [razinaPretplate, id]);
    } catch (err) {
        console.log(err);
    }
    let tereniQuery = 'SELECT * FROM teren WHERE terenID = ?';
    try {
        tereni = await fetchAll(db, tereniQuery, [id]);
    } catch (error) {
        console.log(error);
    }
    res.render('terrain', {
            teren: tereni[0]
        });
    db.close();
});


module.exports = router;