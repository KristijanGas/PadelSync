const express = require('express');
var sqlite3 = require('sqlite3').verbose();

const router = express.Router()

// podstranica za pretraživanje klubova, igrača


router.get('/:username', async (req, res) => {
    const db = new sqlite3.Database("database.db");
    let tereni;
    const username = req.params.username;
    let tereniQuery = 'SELECT * FROM teren WHERE username = ?';
    db.all(tereniQuery, [username], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!rows) {
            res.status(404).send("Field Not Found");
            return;
        }
        tereni = rows;
    });
    let SQLQuery = 'SELECT * FROM korisnik WHERE username = ?';
    db.get(SQLQuery, [username], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (!row) {
            res.status(404).send("User Not Found");
            return;
        }
        const user = {
            username: row.username,
            first_name: row.first_name,
            email: row.email,
        };
        res.render('user', { user: user, session: req.session, tereni: tereni });
    });
    db.close();
});


module.exports = router;