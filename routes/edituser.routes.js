const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer();

const{ requiresAuth } = require('express-openid-connect')

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

router.get('/:username', requiresAuth(), async (req, res) => {
        try{
                const isVerified = await verifyProfile(req);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Player" || profileInDB === "Club" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.username !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(500).send(`You cannot edit this users info. This is not your profile and you are not an admin!`)
                                }
                                let clubPhotos = {};
                                let SQLQuery;
                                let profileTypeOfEditedUser = await findUserType(req.params.username);
                                if(profileTypeOfEditedUser === "Player"){
                                        SQLQuery = `SELECT * FROM igrac WHERE username = ?;`;
                                }else if(profileTypeOfEditedUser === "Club"){
                                        SQLQuery = `SELECT * FROM klub WHERE username = ?;`;
                                }else{
                                        res.status(500).send("User does not exist or cannot be edited?");
                                }
                                

                                const db = new sqlite3.Database("database.db");

                                const getRow = (sql, params) => new Promise((resolve, reject) => {
                                        db.get(sql, params, (err, row) => {
                                        if (err) return reject(err);
                                        resolve(row);
                                        });
                                });
                                const getPhotos = (sql, params) => new Promise((resolve, reject) => {
                                        db.all(sql, params, (err, row) => {
                                                if(err) return reject(err);
                                                resolve(row);
                                        })
                                });
                                let SQLPhotoQuery = `SELECT fotoKlubId FROM foto_klub WHERE username = ?;`;

                                try{
                                        const row = await getRow(SQLQuery, [req.params.username]);
                                        if(profileTypeOfEditedUser === "Club"){
                                                try{
                                                        clubPhotos = await getPhotos(SQLPhotoQuery, [req.params.username]);
                                                }catch(err){
                                                        console.error(err.message);
                                                        if(res) res.status(500).send("Internal Server Error");
                                                        db.close();
                                                        return null;
                                                }
                                        }
                                        db.close();
                                        if(profileTypeOfEditedUser === "Club"){
                                                clubPhotos = clubPhotos.map(p => p.fotoKlubID)
                                        }
                                         res.render("edituser", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        profileType: profileInDB,
                                        profileTypeOfEditedUser: profileTypeOfEditedUser,
                                        usernameOfEditedUser: req.params.username,
                                        userInfo: row,
                                        clubPhotos : clubPhotos
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
                                profileType: profileInDB,
                                usernameOfEditedUser: req.params.username,
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
        res.redirect(`/edituser/${req.oidc.user.nickname}`);
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
        res.redirect(`/edituser/${req.oidc.user.nickname}`);
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
                                        req.body.username]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error updating player info");
                db.close();
                return;
        }
        db.close();
        if(req.oidc.user.nickname === req.body.username){
                res.redirect("/myprofile");
        }else{
                res.redirect("/");
        }
        
});

router.post('/insertClubInfo', requiresAuth(), upload.array("slike"), async (req, res) => {
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
        let SQLPhotoQuery = `INSERT INTO foto_klub (fotoKlubOpis, fotografija, mimeType, username)
                                VALUES ("", ?, ?, ?);`;
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
                                        req.body.username]);
        }catch(err){
                console.error(err.message);
                res.status(500).send("Internal Server Error updating club info");
                db.close();
                return;
        }

        for(const photo of req.files){
                try{
                await runQuery(SQLPhotoQuery, [photo.buffer, photo.mimetype, req.body.username]);
                }catch(err){
                        console.error(err.message);
                        res.status(500).send("Internal Server Error updating club photo info");
                        db.close();
                        return;
                }
        }
        
        let SQLRemovePhotos = `DELETE FROM foto_klub WHERE fotoKlubId = ?`;
        for(const photo of req.body.erasePhotos){
                try{
                        await runQuery(SQLRemovePhotos, [photo]);
                }catch(err){
                        console.error(err.message);
                        res.status(500).send("Internal Server Error removing club photo");
                        db.close();
                        return;
                }
        }
        
        db.close();
        if(req.oidc.user.nickname === req.body.username){
                res.json({redirectURL: "/myprofile"});
        }else{
                res.json({redirectURL: "/"});
        }
});

router.get("/photo/:photoId", async(req, res) => {
        let photo;
        const SQLQuery = `SELECT fotografija, mimeType FROM foto_klub WHERE fotoKlubId = ?`;

        const db = new sqlite3.Database("database.db");

        const getRow = (sql, params) => new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
                if (err) return reject(err);
                resolve(row);
                });
        });
        try{
                photo = await getRow(SQLQuery, [req.params.photoId]);
        }catch(err){
                console.error(err.message);
                if(res) res.status(500).send("Internal Server Error fetching photo");
                db.close();
                return null;
        }
        if(!photo){
                return res.status(404).send("Not found");
        }

        res.set("Content-Type", photo.mimeType);
        res.send(photo.fotografija);

})


module.exports = router;