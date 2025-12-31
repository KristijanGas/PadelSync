const express = require('express');
const { requiresAuth } = require('express-openid-connect');
var sqlite3 = require('sqlite3').verbose();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const { verifyInputText } = require("../backendutils/verifyInputText");

const router = express.Router()
const dbAll = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};


// podstranica za pretraživanje klubova, igrača
router.get('/:username', async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    const username = req.params.username;

    try {
        const tereni = await dbAll(
            db,
            'SELECT * FROM teren WHERE username = ?',
            [username]
        );

        const recenzije = await dbAll(
            db,
            `SELECT r.komentar, r.ocjena, r.datumRecenzija, r.username, r.terenID
             FROM RECENZIJA r
             JOIN TEREN t ON t.terenID = r.terenID
             WHERE t.username = ?`,
            [username]
        );

        const user = await dbGet(
            db,
            'SELECT * FROM korisnik WHERE username = ?',
            [username]
        );

        if (!user) {
            res.status(404).send("User Not Found");
            return;
        }

        res.render('user', {
            user,
            session: req.session,
            tereni,
            recenzije,
            showBackToMyProfile: username === req.oidc.user.nickname
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    } finally {
        db.close();
    }
});



module.exports = router;