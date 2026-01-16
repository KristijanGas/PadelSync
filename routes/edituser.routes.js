const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer();

const{ requiresAuth } = require('express-openid-connect');
const processImages = require('../middlewares/imageprocessor');

const { verifyProfile, verifyDBProfile, findUserType } = require("../backendutils/verifyProfile");
const { verifyInputText } = require("../backendutils/verifyInputText");
const { fetchAddresses } = require("../backendutils/mapbox");
const axios = require('axios')
const sqlite3 = require('sqlite3').verbose();

router.get('/:username', requiresAuth(), async (req, res) => {
        try{
                const isVerified = await verifyProfile(req, res);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Player" || profileInDB === "Club" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.username !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(403).send(`You cannot edit this users info. This is not your profile and you are not an admin!`)
                                }else{
                                        let clubPhotos = {};
                                        let SQLQuery;
                                        let profileTypeOfEditedUser = await findUserType(req.params.username);
                                        if(profileTypeOfEditedUser === "Player"){
                                                SQLQuery = `SELECT * FROM igrac WHERE username = ?;`;
                                        }else if(profileTypeOfEditedUser === "Club"){
                                                SQLQuery = `SELECT * FROM klub WHERE username = ?;`;
                                        }else{
                                                res.status(403).send("User does not exist or cannot be edited?");
                                        }
                                        

                                        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

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
                                }
                        }else{
                              res.render("edituser", {
                                        username: req.oidc.user["https://yourapp.com/username"],
                                        profileType: profileInDB,
                                        usernameOfEditedUser: req.params.username
                                        })
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        }
});

router.post('/chooseType', requiresAuth(), async (req, res) => {
        const { userType } = req.body;
        const isVerified = await verifyProfile(req, res);
        if(!isVerified){
                res.render("verifymail")
                return;
        }
        let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);
        if(profileInDB !== "UserDidntChoose"){
                return res.status(400).send("User type already chosen");
        }
        if(userType !== "Player" && userType !== "Club"){
                return res.status(400).send("Invalid user type");
        }
        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
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
        const isVerified = await verifyProfile(req, res);
        if(!isVerified){
                res.render("verifymail")
                return;
        }
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
        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
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


function checkPlayerInfo(data){
        const errors = [];
        if(data.razZnanjaPadel && data.razZnanjaPadel !== "pro" && data.razZnanjaPadel !== "beginner" && data.razZnanjaPadel !== "intermediate"){
                errors.push("'razZnanjaPadel' must be beginner, intermediate, pro");
        }

        const ime = (data.imeIgrac || "").trim();
        const prezime = (data.prezimeIgrac || "").trim();

        const imeRegex = /^[\p{L}\s\-]{2,30}$/u;
        if (!imeRegex.test(ime) && data.imeIgrac) {
        errors.push("'imeIgrac' must be 2–30 letters, no spaces or special characters.");
        }

        const prezimeRegex = /^[\p{L}]+(?:[ -][\p{L}]+)*$/u;
        if (data.prezimeIgrac && !prezimeRegex.test(prezime)) {
        errors.push(
        "'prezimeIgrac' must be 2–30 chars, letters only, can contain spaces or '-' between names but not at start or end."
        );
        }
        return errors;
}

router.post('/:username/insertPlayerInfo', requiresAuth(), upload.none(), async (req, res) => {
        const errors = checkPlayerInfo(req.body);
        if (errors.length > 0) {
                return res.status(400).json({ errors });
        }
        try{
                const isVerified = await verifyProfile(req, res);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Player" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.username !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(403).send(`You cannot insert this user's info. This is not your profile and you are not an admin!`)
                                }else{
                                        let SQLQuery = `UPDATE igrac
                                                        SET     brojMob = ?,
                                                                prefVrijeme = ?,
                                                                razZnanjaPadel = ?,
                                                                prezimeIgrac = ?,
                                                                imeIgrac = ?
                                                        WHERE 
                                                                username = ?;`;
                                        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
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
                                                                        req.params.username]);
                                        }catch(err){
                                                console.error(err.message);
                                                res.status(500).send("Internal Server Error updating player info");
                                                db.close();
                                                return;
                                        }
                                        db.close();
                                        if(req.oidc.user.nickname === req.params.username){
                                                res.json({redirectURL: "/myprofile"});
                                        }else{
                                                res.json({redirectURL: "/"});
                                        }   
                                }
                        }else{
                                res.status(403).send("You're not a player or admin. Why are you inserting player info?");
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        } 
});


async function timeStringToFloat(time) {
  var hoursMinutes = time.split(/[.:]/);
  var hours = parseInt(hoursMinutes[0], 10);
  var minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
  return hours * 60 + minutes;
}


async function checkClubInfo(data) {
  const errors = [];

        if (data.klubRadiDo) {
                let klubRadiDo = await timeStringToFloat(data.klubRadiDo);
                if(isNaN(klubRadiDo) || klubRadiDo > 1440){
                        errors.push("'Neispravno radno vrijeme (kraj)'");
                }
        }
        if(data.klubRadiOd){
                let klubRadiOd = await timeStringToFloat(data.klubRadiDo);
                if(isNaN(klubRadiOd) || klubRadiOd < 0){
                        errors.push("'Neispravno radno vrijeme (početak)'");
                } 
        }

  if (data.svlacionice < 0 && data.svlacionice)
    errors.push("'svlacionice' is negative");

  if (data.najamReketa < 0 && data.najamReketa)
    errors.push("'najamReketa' is negative");

  if (data.tusevi < 0 && data.tusevi)
    errors.push("'tusevi' is negative");

  if (data.prostorZaOdmor < 0 && data.prostorZaOdmor)
    errors.push("'prostorZaOdmor' is negative");

  const nameRegex = /^[\p{L}\p{N} .,_()\-\s]{3,30}$/u;
  const ime = (data.imeKlub || "").trim().replace(/\s+/g, " ");
  if (!nameRegex.test(ime) && data.imeKlub)
    errors.push("'imeKlub' must be 3–30 chars and contain only letters, numbers and spaces.");

  if(data.adresaKlub){
        try {
                const koordinateRes = await fetchAddresses(data.adresaKlub);

                if (!koordinateRes || !Array.isArray(koordinateRes.features) || koordinateRes.features.length === 0) {
                        errors.push("'nepostojeća adresa'");
                } else {
                        const adresaUnesena = data.adresaKlub.trim().toLowerCase();
                        
                        const found = koordinateRes.features.some(feature => 
                        feature.place_name.toLowerCase() === adresaUnesena
                        );

                        if (!found) {
                                errors.push("'neispravna adresa, odaberite iz izbornika'");
                        }
                }
        } catch (err) {
                return err;
        }

  }
  
  if (!(await verifyInputText(data.pravilaKlub)) && data.pravilaKlub) 
    errors.push("'pravilaKlub' cannot contain special char");

  if(!(await verifyInputText(data.opisKluba)) && data.opisKluba)
        errors.push("'opisKluba' cannot contain special chars");

  return errors;
}

router.post('/:username/insertClubInfo', requiresAuth(), upload.array("slike"), processImages, async (req, res) => {
        const errors = await checkClubInfo(req.body);
        if(!Array.isArray(errors)){
                return res.status(500).send(errors);
        }
        if (errors.length > 0) {
                return res.status(400).json({ errors });
        }
        try{
                const isVerified = await verifyProfile(req, res);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Club" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.username !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(403).send(`You cannot insert this user's info. This is not your profile and you are not an admin!`)
                                }else{
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
                                        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");
                                        const runQuery = (sql, params) => new Promise((resolve, reject) => {
                                                db.run(sql, params, function(err) {
                                                        if (err) return reject(err);
                                                        resolve(this);
                                                });
                                        });
                                        try{
                                                let radiOd, radiDo;
                                                if(req.body.klubRadiDo){
                                                        radiDo = await timeStringToFloat(req.body.klubRadiDo);
                                                }
                                                if(req.body.klubRadiOd){
                                                        radiOd = await timeStringToFloat(req.body.klubRadiDo);
                                                }
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
                                                                        req.params.username]);
                                        }catch(err){
                                                console.error(err.message);
                                                res.status(500).send("Internal Server Error updating club info");
                                                db.close();
                                                return;
                                        }
                                        if(req.processedFiles){
                                                for(const photo of req.processedFiles){
                                                        try{
                                                        await runQuery(SQLPhotoQuery, [photo.buffer, photo.mimetype, req.params.username]);
                                                        }catch(err){
                                                                console.error(err.message);
                                                                res.status(500).send("Internal Server Error updating club photo info");
                                                                db.close();
                                                                return;
                                                        }
                                                }
                                        }
                                        
                                        let SQLRemovePhotos = `DELETE FROM foto_klub WHERE fotoKlubId = ?`;
                                        const erasePhotos = Array.isArray(req.body.erasePhotos)
                                        ? req.body.erasePhotos
                                        : [];

                                        for(const photo of erasePhotos){
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
                                        if(req.oidc.user.nickname === req.params.username){
                                                res.json({redirectURL: "/myprofile"});
                                        }else{
                                                res.json({redirectURL: "/"});
                                        }   
                                }
                        }else{
                                res.status(403).send("You're not a club or admin. Why are you inserting club info?");
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        } 
        
});

router.get("/:username/photo/:photoId", async(req, res) => {
         try{
                const isVerified = await verifyProfile(req, res);
                let profileInDB = await verifyDBProfile(req.oidc.user.nickname, req.oidc.user.email, res);

                if(!isVerified){
                        /* this view needs to be made */
                        res.render("verifymail")
                }else{
                        if(profileInDB === "Club" || profileInDB === "Admin"){
                                //a non-admin user is trying to alter another users info! 
                                if(req.params.username !== req.oidc.user.nickname && profileInDB !== "Admin"){
                                        res.status(403).send(`You cannot view theese photos. This is not your profile and you are not an admin!`)
                                }else{
                                       let photo;
                                        const SQLQuery = `SELECT fotografija, mimeType FROM foto_klub WHERE fotoKlubId = ?`;

                                        const db = new sqlite3.Database(process.env.DB_PATH || "database.db");

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
                                }
                        }else{
                                res.status(403).send("You're not a club or admin. Why are you inserting viewing photos?");
                        }
                }
        }catch(err){
                res.status(500).send("internal server error");
        } 
})


module.exports = router;