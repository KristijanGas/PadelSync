const express = require('express');
const router = express.Router();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile } = require("../backendutils/verifyProfile");
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

router.get('/', requiresAuth(), async (req, res) => {
        try{
                const isVerified = await verifyProfile(req);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                         let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
                        if(profileInDB === "Player"){
                                let SQLQuery = "SELECT * FROM igrac WHERE username = ?;";

                                const db = new sqlite3.Database("database.db");

                                const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });

                                try{
                                        const row = await getRow(SQLQuery, [req.oidc.user.nickname]);
                                        db.close();
                                         res.render("edituser", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        isAuthenticated: req.oidc.isAuthenticated(),
                                        session: req.session,
                                        user: req.oidc.user,
                                        oidcWhole: req.oidc,
                                        tokenInfo: req.oidc.accessToken,
                                        profileType: profileInDB,
                                        playerInfo: row
                                        })
                                }catch(err){
                                        console.error(err.message);
                                        if(res) res.status(500).send("Internal Server Error");
                                        db.close();
                                        return null;
                                }

                        }else if(profileInDB === "Club"){
                                let SQLQuery = "SELECT * FROM klub WHERE username = ?;";

                                const db = new sqlite3.Database("database.db");

                                const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });

                                try{
                                        const row = await getRow(SQLQuery, [req.oidc.user.nickname]);
                                        db.close();
                                        res.render("edituser", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        isAuthenticated: req.oidc.isAuthenticated(),
                                        session: req.session,
                                        user: req.oidc.user,
                                        oidcWhole: req.oidc,
                                        tokenInfo: req.oidc.accessToken,
                                        profileType: profileInDB,
                                        clubInfo: row
                                        })
                                }catch(err){
                                        console.error(err.message);
                                        if(res) res.status(500).send("Internal Server Error");
                                        db.close();
                                        return null;
                                }

                        }else{
                                res.render("edituser", {
                                username: req.oidc.user["https://yourapp.com/username"],
                                isAuthenticated: req.oidc.isAuthenticated(),
                                session: req.session,
                                user: req.oidc.user,
                                oidcWhole: req.oidc,
                                tokenInfo: req.oidc.accessToken,
                                profileType: profileInDB
                                })
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        }
});

router.post('/chooseType', requiresAuth(), async (req, res) => {
        const { userType } = req.body;
        let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if(profileInDB !== "UserDidntChoose"){
                return res.status(400).send("User type already chosen");
        }
        if(userType !== "Player" && userType !== "Club"){
                return res.status(400).send("Invalid user type");
        }
        const db = new sqlite3.Database("database.db");
        let SQLQuery = "";
        if(userType === "Player"){
                SQLQuery = "INSERT INTO igrac (username) VALUES (?);";
        }else if(userType === "Club"){
                SQLQuery = "INSERT INTO klub (username) VALUES (?);";
        }
        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
        try{
                await runQuery(SQLQuery, [req.oidc.user.nickname]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error setting profile type");
                db.close();
                return;
        }
        db.close();
        // Save the userType to the database or session
        req.session.userType = userType;
        res.redirect("/edituser");
});

router.post('/eraseType', requiresAuth(), async (req, res) => {
        let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if(profileInDB === "Admin"){
                return res.status(400).send("You can't erase your profile type because you are an admin.");
        }
        if(profileInDB !== "Player" && profileInDB !== "Club"){
                return res.status(400).send("You can't erase your profile type because you didnt even set it.");
        }
        let SQLQuery = "";
        if(profileInDB === "Player"){
                SQLQuery = "DELETE FROM igrac WHERE username = ?;";
        }else if(profileInDB === "Club"){
                SQLQuery = "DELETE FROM klub WHERE username = ?;";
        }
        const db = new sqlite3.Database("database.db");
        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
        try{
                await runQuery(SQLQuery, [req.oidc.user.nickname]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error removing profile type");
                db.close();
                return;
        }
        db.close();
        res.redirect("/edituser");
});

router.post('/insertPlayerInfo', requiresAuth(), async (req, res) => {
        let SQLQuery = `UPDATE igrac
                        SET     brojMob = ?,
                                prefVrijeme = ?,
                                razZnanjaPadel = ?,
                                prezimeIgrac = ?,
                                imeIgrac = ?
                        WHERE 
                                username = ?;`;
        const db = new sqlite3.Database("database.db");
        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
         try{
                await runQuery(SQLQuery, [req.body.brojMob, 
                                        req.body.prefVrijeme, 
                                        req.body.razZnanjaPadel, 
                                        req.body.prezimeIgrac, 
                                        req.body.imeIgrac, 
                                        req.oidc.user.nickname]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error removing profile type");
                db.close();
                return;
        }
        db.close();
        res.redirect("/myprofile");
});

router.post('/insertClubInfo', requiresAuth(), async (req, res) => {
        let SQLQuery = `UPDATE klub
                        SET     svlacionice = ?,
                                imeKlub = ?,
                                najamReketa = ?,
                                pravilaKlub = ?,
                                klubRadiDo = ?,
                                klubRadiOd = ?,
                                tusevi = ?,
                                adresaKlub = ?,
                                prostorZaOdmor = ?,
                                opisKluba = ?
                        WHERE 
                                username = ?;`;
        const db = new sqlite3.Database("database.db");
        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                        if (err) return reject(err);
                        resolve(this);
                });
        });
         try{
                await runQuery(SQLQuery, [req.body.svlacionice, 
                                        req.body.imeKlub, 
                                        req.body.najamReketa,
                                        req.body.pravilaKlub, 
                                        req.body.klubRadiDo, 
                                        req.body.klubRadiOd, 
                                        req.body.tusevi,
                                        req.body.adresaKlub,
                                        req.body.prostorZaOdmor,
                                        req.body.opisKluba,
                                        req.oidc.user.nickname]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error removing profile type");
                db.close();
                return;
        }
        db.close();
        res.redirect("/myprofile");
});

module.exports = router;