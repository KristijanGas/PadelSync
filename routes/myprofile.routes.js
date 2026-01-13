const express = require('express');
const router = express.Router();
const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");

const { requiresAuth } = require('express-openid-connect')
const axios = require('axios');
const StatusRezervacije = require('../constants/statusRez');
const StatusPlacanja = require('../constants/statusPlacanja');
const sqlite3 = require('sqlite3').verbose();

router.get('/', requiresAuth(), async (req, res) => {
        try {
                const isVerified = await verifyProfile(req, res);
                //console.log(isVerified);

                if (isVerified === undefined || !isVerified) {
                        /* this view needs to be made */
                        res.render("verifymail")
                } else {
                        const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
                        //console.log("profile in db:", profileInDB);
                        if (profileInDB === "UserDidntChoose") {
                                res.redirect(`/edituser/${req.oidc.user.nickname}`);
                                //redirect them to choose
                        }
                        else if (profileInDB === "CorruptedDB") {
                                console.error("Corrupted database, user is both player and club or more");
                                res.status(500).send("Corrupted database, contact admin");
                                return;
                        }
                        else if(profileInDB === "Player" || profileInDB === "Club"){
                                let table;
                                if(profileInDB === "Player"){
                                        table = "igrac";
                                }else{
                                        table = "klub";
                                }
                                let SQLQuery = `SELECT * FROM ${table} WHERE username = ?;`;
                                const db = new sqlite3.Database("database.db");

                                const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });

                                try{
                                        const row = await getRow(SQLQuery, [req.oidc.user.nickname]);
                                        if(profileInDB === "Club"){
                                                let SQLTerrainQuery = `SELECT * FROM teren WHERE username = ?;`;
                                                const terrains = await new Promise((resolve, reject) => {
                                                        db.all(SQLTerrainQuery, [req.oidc.user.nickname], (err, rows) => {
                                                        if (err) return reject(err);
                                                        resolve(rows);
                                                        });
                                                });
                                                row.terrains = terrains;
                                        }else{
                                                let SQLOldRes = `SELECT jr.datumRez, 
                                                        jr.rezervacijaID, 
                                                        jr.transakcijaID, 
                                                        r.statusRez,
                                                        tt.terminID,
                                                        t.terenId,
                                                        tt.vrijemePocetak,
                                                        tt.vrijemeKraj,
                                                        t.imeTeren,
                                                        k.username
                                                        FROM JEDNOKRATNA_REZ jr
                                                        JOIN REZERVACIJA r
                                                                ON jr.rezervacijaID = r.rezervacijaID
                                                        JOIN TERMIN_TJEDNI tt
                                                                ON r.terminID = tt.terminID
                                                        JOIN TEREN t
                                                                ON tt.terenID = t.terenID
                                                        JOIN KLUB k
                                                                ON k.username = t.username
                                                        WHERE jr.username = ?
                                                        AND jr.datumRez < DATE('now')`
                                                const oldRes = await new Promise((resolve, reject) => {
                                                        db.all(SQLOldRes, [req.oidc.user.nickname], (err, rows) => {
                                                        if (err) return reject(err);
                                                        resolve(rows);
                                                        });
                                                });
                                                let SQLNewRes = `SELECT jr.datumRez, 
                                                        jr.rezervacijaID, 
                                                        jr.transakcijaID, 
                                                        r.statusRez,
                                                        tt.terminID,
                                                        t.terenId,
                                                        tt.vrijemePocetak,
                                                        tt.vrijemeKraj,
                                                        t.imeTeren,
                                                        k.username
                                                        FROM JEDNOKRATNA_REZ jr
                                                        JOIN REZERVACIJA r
                                                                ON jr.rezervacijaID = r.rezervacijaID
                                                        JOIN TERMIN_TJEDNI tt
                                                                ON r.terminID = tt.terminID
                                                        JOIN TEREN t
                                                                ON tt.terenID = t.terenID
                                                        JOIN KLUB k
                                                                ON k.username = t.username
                                                        WHERE jr.username = ?
                                                        AND jr.datumRez >= DATE('now')
                                                        AND (statusRez = ? OR statusRez = ?)`
                                                const newRes = await new Promise((resolve, reject) => {
                                                        db.all(SQLNewRes, [req.oidc.user.nickname, StatusRezervacije.AKTIVNA, StatusRezervacije.PENDING], (err, rows) => {
                                                        if (err) return reject(err);
                                                        resolve(rows);
                                                        });
                                                });
                                                row.oldRes = oldRes;
                                                row.newRes = newRes;
                                                const prtpQuery = `select * from pretplata p join TIP_PRETPLATE tp on p.tipPretpID = tp.tipPretpID
                                                                 where p.pretpAktivna = 1 and p.username = ?`;
                                                const pretplate = await new Promise((resolve, reject) => {
                                                        db.all(prtpQuery, [req.oidc.user.nickname], (err, rows) => {
                                                                if(err) return reject(err);
                                                                resolve(rows);
                                                        });
                                                });
                                                row.pretplate = pretplate;
                                        }
                                        db.close();
                                        let currentDateUTC = new Date();
                                        currentDateUTC.setDate(currentDateUTC.getDate()+1);
                                        const nextDate = currentDateUTC.toISOString().split('T')[0];
                                        res.render("myprofile", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        isAuthenticated: req.oidc.isAuthenticated(),
                                        session: req.session,
                                        user: req.oidc.user,
                                        oidcWhole: req.oidc,
                                        tokenInfo: req.oidc.accessToken,
                                        profileType: profileInDB,
                                        userInfo: row,
                                        date: nextDate
                                        })
                                }catch(err){
                                        console.error(err.message);
                                        if(res) res.status(500).send("Internal Server Error");
                                        db.close();
                                        return null;
                                }

                        }
                }
        } catch (err) {
                res.status(500).send("internal server error");
        }
});

router.get('/handleReservations', requiresAuth(), async (req, res) => {
        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
        try {
                const isVerified = await verifyProfile(req, res);
                if (!isVerified) return res.render("verifymail");

                const profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
                if(profileInDB !== 'Club') {
                        res.status(403).send("samo klubovi mogu vidjet njihove rezervacije koje cekaju");
                        return;
                } else {
                        const query = `SELECT datumRez, JEDNOKRATNA_REZ.username as username, imeTeren, iznos, vrijemePocetak, vrijemeKraj, rezervacijaID, TEREN.terenID
                                        FROM JEDNOKRATNA_REZ NATURAL JOIN REZERVACIJA
                                        NATURAL JOIN TERMIN_TJEDNI JOIN TEREN ON TERMIN_TJEDNI.terenID = TEREN.terenID
                                        NATURAL JOIN TRANSAKCIJA
                                        WHERE TEREN.username =  ? AND statusRez = ? and statusPlac = ?`;
                        const rows = await new Promise((resolve, reject) => {
                                db.all(query, [req.oidc.user.nickname, StatusRezervacije.PENDING, StatusPlacanja.NEPLACENO], function(err, rows) {
                                        if(err) reject(err);
                                        resolve(rows);
                                });
                        });
                        res.render('handleRes',{
                                rezervacije: rows
                        });
                }
        } catch (err) {
                console.error(err);
                res.status(500).send("oopsie :(");
        }
        db.close();
});

module.exports = router;