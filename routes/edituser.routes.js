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
                res.status(500).send("Internal Server Error");
                db.close();
                return;
        }
        db.close();
        console.log("User type set to:", userType,"name",req.oidc.user.nickname,SQLQuery);
        // Save the userType to the database or session
        req.session.userType = userType;
        res.redirect("/edituser");
});

module.exports = router;