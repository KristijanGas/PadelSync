const express = require('express');
var sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios');
const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

router.get('/cancelSub/:pretpID', requiresAuth(), async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    try {
        const isVerified = await verifyProfile(req, res);
        if (!isVerified) return res.render("verifymail");

        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if (profileInDB !== 'Player')
            return res.status(500).send("samo igrači mogu otkazivati pretplate");

        const pretpID = req.params.pretpID;
        const query = `SELECT * FROM PRETPLATA WHERE pretpAktivna = 1 AND pretpID = ? and username = ?`
        let row = await dbGet(db, query, [pretpID, req.oidc.user.nickname]);
        if(!row)
            return res.status(500).send("ne možete otkazati tuđu pretplatu");
        const updQuery = `UPDATE PRETPLATA SET pretpAktivna = 0 WHERE pretpID = ?`
        await new Promise((resolve, reject) => {
            db.run(updQuery, [pretpID], function(err) {
                if(err) return reject(err);
                resolve(this);
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("oopsie :(");
    }
    db.close();
});

//odobravanje jednokratnih koje se placaju gotovinom
router.get('/confirmReservation/:rezervacijaID', requiresAuth(), async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    try {
        const isVerified = await verifyProfile(req, res);
        if (!isVerified) return res.render("verifymail");

        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if (profileInDB !== 'Club') {
            res.status(403).send("kud si pošo nisi ti klub da odobravaš rezervaciju");
        } else {
            const query = `select transakcijaID from JEDNOKRATNA_REZ natural join REZERVACIJA natural join TERMIN_TJEDNI tt join TEREN t on tt.terenID = t.terenID
                        where rezervacijaID = ? and t.username = ?`;
            let row = await dbGet(db, query, [req.params.rezervacijaID, req.oidc.user.nickname]);
            if(!row)
                res.status(403).send("ne možeš potvrditi tuđu rezervaciju");
            let transakcijaID = row.transakcijaID;
            const updQuery = `UPDATE REZERVACIJA SET statusRez = ? WHERE rezervacijaID = ?`;
            await new Promise((resolve, reject) => {
                db.run(updQuery, [StatusRezervacije.AKTIVNA, req.params.rezervacijaID], function(err) {
                    if(err) return reject(err);
                    resolve(this);
                });
            });
            const updQuery2 = `UPDATE TRANSAKCIJA SET statusPlac = ? WHERE transakcijaID = ?`;
            await new Promise((resolve, reject) => {
                db.run(updQuery2, [StatusPlacanja.POTVRDJENO, transakcijaID], function(err) {
                    if(err) return reject(err);
                    resolve(this);
                });
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("oopsie :(");
    }
    db.close();
});

router.get('/rejectReservation/:rezervacijaID', requiresAuth(), async (req, res) => {
    const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
    try {
        const isVerified = await verifyProfile(req, res);
        if (!isVerified) return res.render("verifymail");

        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if(profileInDB === 'Club') {
            const query = `select transakcijaID from JEDNOKRATNA_REZ natural join REZERVACIJA natural join TERMIN_TJEDNI tt join TEREN t on tt.terenID = t.terenID
                        where rezervacijaID = ? and t.username = ?`;
            let row = await dbGet(db, query, [req.params.rezervacijaID, req.oidc.user.nickname]);
            if(!row)
                res.status(403).send("ne možeš otkazati tuđu rezervaciju");

            const transakcijaID = row.transakcijaID;
            const updQuery = `UPDATE REZERVACIJA SET statusRez = ? WHERE rezervacijaID = ?`;
            await new Promise((resolve, reject) => {
                db.run(updQuery, [StatusRezervacije.ODBIJENA, req.params.rezervacijaID], function(err) {
                    if(err) return reject(err);
                    resolve(this);
                });
            });

            const updQuery2 = `UPDATE TRANSAKCIJA SET statusPlac = ? WHERE transakcijaID = ?`;
            await new Promise((resolve, reject) => {
                db.run(updQuery2, [StatusPlacanja.OTKAZANO, transakcijaID], function(err) {
                    if(err) return reject(err);
                    resolve(this);
                });
            });
        } else {
            res.status(403).send("skuhan si");
        }
    } catch (error) {
        res.status(500).send("oopsie :(");
    }
    db.close();
});

module.exports = router;